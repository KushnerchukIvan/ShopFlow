# ShopFlow architecture

## System boundaries

ShopFlow is a monorepo with three deployable pieces:

- `frontend/` — a React 19 SPA built with Vite. It owns presentation, client routing, form state, and cache management, but never calculates authoritative stock or financial values.
- `backend/` — a Laravel 13 REST API. It owns authentication, authorization, validation, persistence, transactions, reporting aggregations, and the immutable inventory ledger.
- PostgreSQL and Redis — PostgreSQL is the source of truth; Redis provides cache, sessions (production), and queues.

The browser talks to `/api/v1/*` through Axios with credentialed cookies. Both development and production keep the SPA and API same-site (5173 → 8000 in development; same origin behind Nginx in production) so Sanctum’s stateful cookie flow works without token storage.

## Backend structure

```
app/
├── Console/Commands/       first-admin command
├── Enums/                  Role, MovementType, document statuses
├── Events/                 LowStockDetected
├── Exceptions/             (Laravel defaults; API JSON rendering configured)
├── Http/
│   ├── Controllers/Api/V1/ thin controllers grouped by resource
│   ├── Middleware/         active-account and role checks
│   ├── Requests/           Form Request validation
│   └── Resources/          API Resources and response shapes
├── Jobs/                   RecordLowStockAlert queued job
├── Listeners/              QueueLowStockAlert
├── Models/                 Eloquent models and relationships
├── Policies/               ProductPolicy
├── Providers/              rate limiting, event wiring
└── Services/               transactional inventory, purchasing, transfer, adjustment logic
```

Controllers validate input, authorize access, delegate to a service, and return API Resources. Business rules that touch more than one row live in services:

- `InventoryService` — stock in/out, row locking, movement creation, activity logs, low-stock event dispatch.
- `TransferService` — draft creation, stock validation, submission, atomic completion, cancellation.
- `StockAdjustmentService` — physical-count drafts, stale-count detection, reconciliation, adjustment movements.
- `PurchaseOrderService` — draft creation/update, submission, partial/full receiving, cancellation.

## Database model

```
users ──< warehouse_user >── warehouses
users ──< stock_movements >── products
suppliers ──< products >── categories (parent_id self-reference)
products ──< stock_balances >── warehouses
products ──< stock_movements >── warehouses
products ──< purchase_order_items >── purchase_orders
products ──< inventory_transfer_items >── inventory_transfers
products ──< stock_adjustment_items >── stock_adjustments
users ──< activity_logs
```

Key constraints and indexes:

- `products.sku` and `products.barcode` are unique; products are soft-deleted.
- Monetary fields use PostgreSQL `decimal(12,2)`, never floats.
- `stock_balances` has a unique `(product_id, warehouse_id)` constraint and a non-negative application invariant.
- `stock_movements` is append-only. Eloquent model events throw on update/delete.
- Foreign keys use `restrictOnDelete` where history must be preserved, and cascade only for dependent document lines.
- Frequent filters are indexed: SKU, barcode, names, movement type/warehouse/date, supplier, document status, and warehouse/date composites.

## Authentication and authorization flow

1. The SPA calls `GET /sanctum/csrf-cookie` to obtain the session and `XSRF-TOKEN` cookies.
2. The SPA posts credentials to `/api/v1/login`.
3. `AuthController` verifies credentials with `Auth::attempt`, rejects inactive accounts, regenerates the session, and returns the user.
4. Every protected request passes through `auth:sanctum` and the `active` middleware.
5. Role middleware (`role:...`) gates write endpoint groups. Services and controllers additionally enforce warehouse access with `canAccessWarehouse`.
6. Policies cover product writes. Warehouse scoping is applied in queries for inventory, movements, reports, purchase orders, transfers, and adjustments.
7. Logout invalidates the session and regenerates the CSRF token.

The frontend route guards are a usability layer only. Server-side middleware, services, and policies remain the security boundary.

## Inventory transaction flow

All critical operations use `DB::transaction`.

### Stock in/out

1. Authorize the user for the warehouse.
2. `lockForUpdate()` the `(product, warehouse)` balance row (creating a zero row if needed).
3. For stock out, reject quantities above the available balance.
4. Update the balance.
5. Append an `IN` or `OUT` movement with the actor, reason, notes, and optional document reference.
6. Write an activity log.
7. Emit `LowStockDetected` when the balance is at or below the product minimum. A queued job records the alert.

### Warehouse transfer

1. Draft: validate different warehouses and sufficient stock; store lines.
2. Submit: lock the transfer and source balances; revalidate stock; move to `IN_TRANSIT`.
3. Complete: lock the transfer and every source/destination balance in a deterministic order; decrement source, increment destination, append `TRANSFER_OUT`/`TRANSFER_IN` movements referencing the transfer, and mark `COMPLETED`.
4. Repeating submit/complete is rejected by status checks, so the operation cannot be double-processed.
5. Total stock across warehouses is unchanged by a successful completion.

### Stock adjustment

1. Draft: snapshot system quantities and store counted quantities and differences.
2. Submit: lock the adjustment and balances; reject the submission if any balance changed since the count (stale count); set balances to counted quantities; append `ADJUSTMENT_IN`/`ADJUSTMENT_OUT` movements referencing the adjustment.
3. Previous movements are never edited or deleted.

### Purchase order receiving

1. Only `ORDERED` or `PARTIALLY_RECEIVED` orders can be received.
2. Lock the order and each matched item; reject quantities above outstanding amounts.
3. Increment the destination warehouse balances, append `IN` movements referencing the purchase order, and update received quantities.
4. Set `PARTIALLY_RECEIVED` or `RECEIVED` (with `received_at`) based on outstanding quantities.
5. Cancelled orders cannot be received; fully received orders cannot be cancelled.

## API architecture

- Versioned prefix: `/api/v1`.
- Sanctum stateful SPA cookies and CSRF protection.
- Success envelope: `{ "data": ... }`; list endpoints include `meta` pagination data.
- Validation failures: HTTP 422 with `{ "message", "errors" }`.
- Errors use appropriate status codes (401, 403, 404, 409, 422, 429, 500) without leaking stack traces in production.
- Server-side pagination, filtering, sorting, and search are implemented for all major lists.
- Reports aggregate in PostgreSQL; CSV exports stream rows and sanitize formula-leading text cells.
- API documentation: [`openapi.yaml`](openapi.yaml).

## Frontend architecture

```
src/
├── app/          router guards, providers, layouts
├── components/   reusable UI primitives (Button, Field, Modal, DataTable, Pagination, StatCard, States, Tabs, SearchInput)
├── features/     auth, dashboard, products, categories, inventory, stock-movements,
│                 warehouses, suppliers, purchase-orders, transfers, adjustments,
│                 reports, users, settings
├── hooks/        auth state and debouncing
├── lib/          Axios client, API functions, error normalization, formatting
├── stores/       Zustand UI state (theme, mobile sidebar)
├── types/        shared TypeScript API types
└── utils/        class-name helper
```

- TanStack Query owns server state, caching, invalidation, and loading/error states.
- Zustand owns small client-only state (theme, mobile navigation).
- React Hook Form + Zod validate the login form; other forms use typed controlled state with API validation as the final authority.
- All major routes are lazy-loaded.
- The layout provides a collapsible desktop sidebar, mobile drawer, breadcrumbs, theme toggle, notifications shortcut, profile menu, and role-aware navigation.
- Tables use server-side pagination/sorting and show loading, empty, error, and success states.

## Testing strategy

- **Backend (PHPUnit)** — authentication, role/warehouse boundaries, product lifecycle, image upload, stock in/out, insufficient stock, transfers, adjustments, stale counts, purchase-order receiving, dashboard aggregates, reports, CSV safety, users, settings, and the seeded ledger invariant.
- **Frontend (Vitest + React Testing Library)** — reusable UI components, form field errors, table empty/row/sort behavior, pagination, authentication redirects, route guards, role guards, and API error normalization.
- **End-to-end (Playwright)** — real browser flows for login/logout, invalid credentials, product creation/archiving, stock in/out, purchase-order receiving, transfers, and adjustments against the running stack.
