# Installation and local development

## Prerequisites

- Docker Desktop with the Linux engine running and Docker Compose v2 or newer.
- Node.js 22+ and npm for frontend checks and end-to-end tests.
- PHP 8.3+ and Composer 2 if you want to run backend commands on the host. The Compose stack supplies PHP 8.5, PostgreSQL, and Redis.

## First-time installation

From the repository root in PowerShell:

```powershell
Copy-Item .env.example .env
```

Set a local `POSTGRES_PASSWORD` in `.env` (the default `change-me-locally` is only for local development), then start the stack:

```powershell
docker compose up --build -d
docker compose ps
```

Generate a Laravel application key:

```powershell
docker compose exec -T api php artisan key:generate --show
```

Copy the printed `base64:...` value into `APP_KEY` in the root `.env`, recreate the API and queue worker so they receive the value, then migrate and seed:

```powershell
docker compose up -d --force-recreate api worker
docker compose exec -T api php artisan migrate --seed --force
```

Open:

- Frontend: <http://localhost:5173>
- API health: <http://localhost:8000/up>

The seeder creates 9 demo users, 3 warehouses, 8 categories, 5 suppliers, 40 products, stock balances, historical movements, purchase orders, transfers, and stock adjustments. It refuses to run when `APP_ENV` is not `local` or `testing`.

## Demo credentials

Password for every account: `ShopFlow!Demo2026`.

| Role | Email |
| --- | --- |
| Administrator | `admin@example.test` |
| Manager | `manager1@example.test` |
| Manager | `manager2@example.test` |
| Warehouse operator | `operator1@example.test` |
| Warehouse operator | `operator2@example.test` |
| Warehouse operator | `operator3@example.test` |
| Warehouse operator | `operator4@example.test` |
| Viewer | `viewer1@example.test` |
| Viewer | `viewer2@example.test` |

## Run checks

### Backend

The PHPUnit suite uses in-memory SQLite, so it does not need PostgreSQL or Redis:

```powershell
Push-Location backend
composer install
php artisan test --compact
vendor/bin/pint --format agent
Pop-Location
```

### Frontend

```powershell
Push-Location frontend
npm ci
npm test
npm run build
npm run lint
Pop-Location
```

### End-to-end tests

The Playwright suite uses the installed Chrome channel, so it does not download a browser. Start the development stack first, then:

```powershell
Push-Location frontend
npm run test:e2e
Pop-Location
```

The tests log in as the demo administrator and exercise login/logout, invalid credentials, product creation/archiving, stock in/out, purchase-order receiving, transfers, and adjustments. They mutate demo data; use `migrate:fresh --seed` to reset it when needed.

## Reset local data

Stop containers while preserving database data:

```powershell
docker compose down
```

Remove the PostgreSQL and Redis volumes as well:

```powershell
docker compose down --volumes
```

Then rebuild and reseed:

```powershell
docker compose up --build -d
docker compose exec -T api php artisan migrate --seed --force
```

## Production stack

An isolated production reference stack is available. It uses the `shopflow-prod` Compose project name, so it does not collide with the development stack:

```powershell
Copy-Item .env.production.example .env.production
# Fill APP_KEY, APP_URL, APP_DOMAIN, SESSION_DOMAIN, and POSTGRES_PASSWORD.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan shopflow:create-admin admin@example.com
```

The web container serves the built SPA and proxies API requests to PHP-FPM. See [deployment](DEPLOYMENT.md) for HTTPS, backups, and security requirements.

## Common issues

- **Docker engine unavailable** — start Docker Desktop and wait for the Linux engine, then retry `docker compose ps`.
- **API cannot reach PostgreSQL** — check `docker compose logs api postgres redis`. Compose waits for healthy database and Redis containers before starting the API.
- **Login fails after a fresh checkout** — verify `APP_KEY` is set in the root `.env` and the API container was recreated after setting it.
- **Too many login attempts** — development allows 60 attempts per minute; production stays at 5 per minute.
- **Generated Laravel cache leaks into an image** — `backend/.dockerignore` excludes `bootstrap/cache/*.php`. Run `php artisan optimize:clear` if a host cache causes stale providers.
- **Product images return 404** — the API image creates the `public/storage` symlink during the build. In production, Nginx serves the shared `api_storage` volume at `/storage/`.
- **CORS or session errors** — confirm `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` match the frontend origin and that requests use `withCredentials`.
- **Development and production stack ports collide** — the development stack uses 5173/8000 and the production reference stack uses 8080; both use separate Compose project names and volumes.
