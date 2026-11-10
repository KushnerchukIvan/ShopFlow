# Implementation status

Last verified: 2026-11-10

## Summary

ShopFlow is implemented as a working full-stack application. The development Docker stack starts PostgreSQL, Redis, the Laravel API, the React/Vite frontend, and a queue worker. The database can be recreated from migrations and seeded with realistic demo data. A separate production reference stack (PHP-FPM + Nginx + static React build + Redis queue worker) was also built, migrated, seeded in an isolated test project, and verified through Nginx.

The previous blocker — Docker migrations — is resolved. Migrations run successfully against PostgreSQL, the seeder is idempotent, negative stock balances are prevented, and the stack survives a fresh-volume rebuild.

## What was fixed during this continuation

- Repaired Windows workspace permissions so the project tree could be modified.
- Removed recursive duplicate copies that had accumulated under `backend/app`, `bootstrap`, `config`, `database`, `routes`, and `tests`.
- Generated and configured `APP_KEY`; recreated the API with the new environment.
- Rebuilt the API image so the container no longer used a stale seeder that called `fake()`.
- Fixed the demo seeder ordering bug where a completed transfer could push a product below zero after the low-stock scenario ran.
- Prevented generated `bootstrap/cache/*.php` from leaking into Docker builds, which had caused a `Laravel\Boost\BoostServiceProvider` boot failure in production images.
- Added production Docker images, Nginx configuration, an isolated `shopflow-prod` Compose project, and a first-admin artisan command.
- Added the missing dashboard, users, settings, report aggregation, movement detail/export, product image, category tree, warehouse stats/employees, and role/warehouse management endpoints.
- Rebuilt the frontend as a feature-based React application with all required pages, reusable UI primitives, dark theme, role-aware navigation, and responsive layouts.
- Added backend, frontend, and Playwright tests.

## Completed functionality

### Foundation and infrastructure

- Monorepo structure: `frontend/`, `backend/`, `docker/`, `docs/`.
- Development Compose stack: API, frontend, PostgreSQL, Redis, queue worker.
- Production Compose stack: PHP-FPM API, Nginx web/static build, PostgreSQL, Redis, queue worker.
- Environment examples: `.env.example`, `.env.production.example`, `backend/.env.example`, `frontend/.env.example`.
- Health endpoint, Docker health checks, storage symlink, persistent volumes.

### Authentication and authorization

- Sanctum stateful SPA cookies with CSRF protection.
- Login, logout, profile, and password change.
- Active-account middleware.
- Four roles: admin, manager, warehouse operator, viewer.
- Role middleware, warehouse-scoped queries, product policy, and login rate limiting.
- Admin-only users/settings/warehouse CRUD; managers retain catalog, purchasing, inventory, transfer, adjustment, and employee-assignment capabilities where permitted.

### Database and inventory

- PostgreSQL migrations with foreign keys, unique constraints, indexes, decimal money columns, soft-deleted products, and immutable movement columns.
- Stock balances with a unique product/warehouse constraint and non-negative invariant.
- Transactional stock in/out with `lockForUpdate`.
- Transfers with draft → in transit → completed/cancelled workflows and atomic dual-warehouse balance updates.
- Stock adjustments with system-count snapshot, difference preview, stale-count rejection, and adjustment movements.
- Purchase orders with drafts, submission, partial/full receiving, cancellation, and receipt-linked movements.
- Activity logs, low-stock event, queued low-stock alert job, and queue worker.
- Demo seeder: 9 users, 3 warehouses, 8 categories, 5 suppliers, 40 products, 120 balances, 143 movements, 5 purchase orders, 4 transfers, 2 adjustments, and low-stock scenarios.

### API

- `/api/v1` versioned REST API with consistent `data`/`meta` envelopes.
- Dashboard summary, charts, recent movements, and low-stock endpoints.
- Full CRUD APIs for products, categories, suppliers, and warehouses.
- Inventory listing/filtering/sorting, stock in/out, transfers, and adjustments.
- Purchase-order create/update/submit/receive/cancel.
- Stock-movement list, detail, and CSV export.
- Report endpoints for valuation, warehouse/category aggregation, low stock, movements, purchase history, and CSV exports.
- Users CRUD, status patch, warehouse assignments, and workspace settings.
- Auth aliases under `/auth/*` in addition to the SPA-friendly `/login`, `/logout`, `/user` routes.
- OpenAPI specification at [`docs/openapi.yaml`](openapi.yaml).

### Frontend

- Feature-based application structure with lazy-loaded routes.
- Responsive app shell: sidebar, mobile drawer, topbar, breadcrumbs, notifications shortcut, profile menu, and theme toggle.
- Reusable components: Button, Field/Input/Select/Textarea/Checkbox, Badge, Modal, ConfirmDialog, DataTable, Pagination, SearchInput, Tabs, StatCard, PageHeader, SectionCard, Empty/Error/Loading/Skeleton states.
- Login with React Hook Form + Zod validation and demo-account shortcuts.
- Dashboard with KPI cards, inventory value chart, movement chart, category distribution, top products, recent movements, low-stock alerts, recent purchase orders, and quick actions.
- Products list/detail/create/edit/archive with image upload and warehouse stock.
- Categories with nested parent selection and guarded deletion.
- Inventory with server-side search, filters, sorting, pagination, stock in/out, transfer and adjustment shortcuts.
- Stock movements with type/warehouse/product/date/search filters, pagination, detail modal, and CSV export.
- Warehouses list/detail/edit, warehouse stats, low-stock panel, employees, and inventory.
- Suppliers list/detail/create/edit/archive and purchase-order history.
- Purchase orders list/filters/create/edit draft/detail/submit/cancel/partial receive.
- Transfers list/create/detail/submit/complete/cancel with client-side stock pre-check.
- Adjustments list/create/detail with live difference preview and submit.
- Reports tabs: valuation, top products, by warehouse, by category, low stock, movements, purchase history, with CSV exports.
- Users and settings admin pages.
- Profile and password change.

## Verification results

| Check | Command | Result |
| --- | --- | --- |
| Backend tests | `php artisan test --compact` | **44 passed, 272 assertions** |
| Backend formatting | `vendor/bin/pint --format agent` | **Passed** |
| Frontend tests | `npm test` | **17 passed in 4 files** |
| Frontend production build | `npm run build` | **Passed** (TypeScript + Vite) |
| Frontend lint | `npm run lint` | **0 errors, 8 warnings** |
| End-to-end tests | `npm run test:e2e` | **7 passed** |
| Fresh installation | `docker compose down --volumes`, `up --build -d`, `migrate --seed` | **Passed** |
| Seeded data | PostgreSQL count query | 9 users, 40 products, 143 movements, 5 POs, 4 transfers, 2 adjustments |
| Negative balances | PostgreSQL count query | **0** |
| 320 px responsiveness | Playwright audit over 14 routes | **No horizontal page overflow** |
| Queue worker | Low-stock event → queued job → activity log | **Passed** |
| Production browser | Playwright login and KPI render at `http://localhost:8080` | **Passed** |
| Production upload | Product image upload + `/storage/` retrieval through Nginx | **Passed** (200/200) |
| Browser smoke | 25 authenticated routes + 6 report tabs, console errors | **Passed** |

The Playwright run covers login/logout, invalid credentials, stock in/out, product create/archive, purchase-order create/submit/receive, transfer create/submit/complete, and adjustment create/apply.

## Known limitations and notes

- Frontend lint reports 8 React Compiler `set-state-in-effect` warnings for forms that hydrate state from fetched data or modal props. There are no lint errors, and the build/tests pass.
- Backend PHPUnit uses in-memory SQLite for speed. PostgreSQL was verified manually against the Docker stack (migrations, seeding, login, reads, writes, fresh volumes) and through the end-to-end tests, but the automated PHPUnit suite does not run against PostgreSQL.
- The OpenAPI file is provided as documentation; no Swagger UI route is bundled.
- The production Compose stack terminates plain HTTP. TLS, HSTS, log shipping, automated backups, and secret-manager integration are expected from the hosting edge.
- The development login rate limit is relaxed to 60 attempts per minute to support the end-to-end suite. Production keeps 5 attempts per minute.
- The demo seeder intentionally refuses to run outside `local`/`testing`. Use `php artisan shopflow:create-admin` for a production administrator.
- Activity logs are recorded and queryable in the database, but there is no dedicated activity-log screen. The stock-movement ledger is the user-facing audit trail.
- Repositories and Actions folders were not introduced; business logic is isolated in domain services instead of unnecessary abstractions.
- Product image uploads are limited to 2 MB and JPG/PNG/WebP MIME types.

## Continue

```powershell
# Start the development stack
docker compose up -d

# Rebuild after backend/frontend changes
docker compose build api frontend worker
docker compose up -d --force-recreate api frontend worker

# Reset and reseed local data
docker compose exec -T api php artisan migrate:fresh --seed --force

# Backend checks
Push-Location backend
php artisan test --compact
vendor/bin/pint --format agent
Pop-Location

# Frontend checks
Push-Location frontend
npm test
npm run build
npm run lint
npm run test:e2e
Pop-Location
```

Demo password: `ShopFlow!Demo2026`. See the README for the full account list.
