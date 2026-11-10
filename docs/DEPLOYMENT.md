# Production deployment

The repository includes a reference production stack in `docker-compose.prod.yml`. It is deliberately separate from the development stack (`name: shopflow-prod`) and uses PHP-FPM behind Nginx, a static React build, PostgreSQL 17, Redis 7, and a queue worker.

For a real internet-facing deployment, terminate TLS at a trusted load balancer, reverse proxy, or ingress in front of the `web` container. The included Nginx container speaks HTTP only.

## Production topology

- `web` — Nginx, serves the built SPA from `/usr/share/nginx/html`, sends `/api/*` and `/sanctum/*` to PHP-FPM, and serves uploaded product images from the shared `api_storage` volume at `/storage/*`.
- `api` — PHP-FPM 8.5, Laravel production dependencies, no published host port.
- `worker` — `php artisan queue:work` using Redis. Used by the low-stock alert pipeline.
- `postgres` — PostgreSQL 17, private Compose network only.
- `redis` — Redis 7 with append-only persistence, private Compose network only.

## 1. Prepare secrets

```powershell
Copy-Item .env.production.example .env.production
```

Fill in:

```dotenv
APP_KEY=base64:...
APP_URL=https://shopflow.example.com
APP_DOMAIN=shopflow.example.com
SESSION_DOMAIN=shopflow.example.com
SESSION_SECURE_COOKIE=true
POSTGRES_PASSWORD=<a unique strong password>
WEB_PORT=8080
```

Generate `APP_KEY` with a throwaway container or a local PHP installation:

```powershell
docker run --rm php:8.5-cli php -r "echo 'base64:'.base64_encode(random_bytes(32));"
```

Keep `.env.production` out of version control. Inject secrets from your platform's secret manager where possible.

## 2. Build and start

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## 3. Migrate and create the first administrator

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan shopflow:create-admin admin@example.com
```

The command prompts for a password and creates an active administrator without loading demo data. **Never run `db:seed` in production.**

## 4. Put HTTPS in front

Point your TLS terminator at `http://<host>:${WEB_PORT}` and forward the original host/protocol headers. Then verify:

- `https://shopflow.example.com/` loads the SPA.
- `https://shopflow.example.com/up` returns `200`.
- `https://shopflow.example.com/sanctum/csrf-cookie` sets cookies over HTTPS.
- Login succeeds, cookies are `Secure`, and API requests include the `X-XSRF-TOKEN` header.

Set `APP_URL`, `APP_DOMAIN`, `SESSION_DOMAIN`, and `SESSION_SECURE_COOKIE` to match the final HTTPS hostname. Recreate `api` and `worker` after changing environment values:

## 5. Release checks

1. Build images in CI with the same Dockerfiles and tagged versions.
2. Run the backend test suite (`php artisan test`) and frontend checks (`npm test`, `npm run build`, `npm run lint`, `npm run test:e2e` against staging).
3. Apply migrations as a release step. Back up the database before migrations.
4. Verify login, CSRF, role restrictions, warehouse scoping, stock in/out, transfer completion, purchase-order receiving, adjustments, and CSV exports in staging.
5. Confirm the queue worker is running and Redis persistence is healthy.
6. Confirm product image uploads are visible under `/storage/`.
7. Roll out the new `web`, `api`, and `worker` images. Keep the previous image tags for rollback.

## Operational checklist

- **TLS** — HTTPS only; HSTS at the edge; redirect HTTP to HTTPS.
- **Cookies** — `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`, exact `SESSION_DOMAIN`, no wildcard CORS with credentials.
- **Database** — managed or private PostgreSQL, encrypted backups, tested restore procedure, least-privilege application user.
- **Redis** — private network or authentication/TLS from the provider; persistence enabled where queues matter.
- **Secrets** — rotate `APP_KEY` only with a documented plan; rotating it invalidates encrypted cookies/sessions. Keep database and Redis credentials in a secret manager.
- **Logs** — ship application and Nginx logs to centralized storage; enable error monitoring and alerting on 5xx rates.
- **Uploads** — validate MIME type and size (2 MB, JPG/PNG/WebP) at the API; serve through Nginx; scan uploads if your threat model requires it.
- **Rate limits** — login is limited to 5 attempts/minute in production. Add edge-level rate limiting for `/api/*` if needed.
- **Backups** — schedule PostgreSQL backups, retain them off-host, and test restores regularly.
- **Health checks** — monitor `/up` and container health; restart or alert on failure.
- **Scaling** — `web` and `api` can scale horizontally behind the load balancer. Keep queue workers as a separate deployment. PostgreSQL and Redis should be managed services for serious workloads.

## Useful commands

```powershell
# Logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api web worker

# Apply migrations
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan migrate --force

# Clear Laravel caches after configuration changes
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan optimize:clear

# Create or promote an administrator
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api php artisan shopflow:create-admin admin@example.com

# Stop the stack without deleting database volumes
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

## Known limitations of the reference stack

- Nginx terminates plain HTTP; TLS is expected from the hosting edge.
- The queue worker runs as a single process in Compose. Use a supervisor or platform worker for production resilience.
- Automated backups, log shipping, and secret-manager integration are intentionally left to the hosting environment.
