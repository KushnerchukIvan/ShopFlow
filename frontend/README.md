# ShopFlow frontend

React 19 + TypeScript SPA for ShopFlow, built with Vite and Tailwind CSS 4.

## Development

```bash
npm ci
cp .env.example .env
npm run dev
```

The app expects the Laravel API at `VITE_API_URL` (default `http://localhost:8000`).

## Structure

- `src/app/` — router guards, providers, layouts.
- `src/components/ui/` — reusable primitives (Button, Field, Modal, DataTable, Pagination, states, tabs).
- `src/features/` — auth, dashboard, products, categories, inventory, stock movements, warehouses, suppliers, purchase orders, transfers, adjustments, reports, users, settings.
- `src/lib/` — typed Axios API client, error normalization, formatting.
- `src/hooks/` — authentication and debouncing hooks.
- `src/stores/` — Zustand UI state (theme, mobile sidebar).
- `src/types/` — shared API types.

## Checks

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Playwright uses the installed Chrome channel (`channel: 'chrome'`) and expects the development stack at <http://localhost:5173>. See the repository root README and `docs/` for installation, API, and deployment details.
