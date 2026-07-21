# Deployment Guide

Production deployment guide for the IT Asset Lifecycle Management platform:
`packages/backend` (NestJS 10 + TypeORM 0.3 + PostgreSQL) and
`packages/frontend` (React 18 + Vite + Ant Design), served together behind
an Nginx reverse proxy.

> The repository does not currently ship `Dockerfile`s, a
> `docker-compose.yml`, or an `nginx.conf`. This guide provides
> production-ready templates for all three — add them to the repo root (or
> your infra repo) as `packages/backend/Dockerfile`,
> `packages/frontend/Dockerfile`, `docker-compose.yml`, and
> `deploy/nginx.conf` respectively, adjusting paths/registry names to match
> your CI.

## 1. Architecture overview

```
                      ┌──────────────────────────┐
   Internet  ──443──▶ │          Nginx            │
                      │  - serves frontend static  │
                      │    build (React/Vite)      │
                      │  - reverse-proxies /api/*  │
                      │    to the backend          │
                      └───────────┬──────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                          │
             ┌───────▼───────┐          ┌───────▼───────┐
             │  Frontend      │          │   Backend      │
             │  static assets │          │   NestJS API   │
             │  (dist/)       │          │   :3000        │
             └────────────────┘          └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │  PostgreSQL 15+ │
                                          │     :5432        │
                                          └───────────────┘
```

Because the frontend calls a **relative** API base URL by default
(`VITE_API_BASE_URL` defaults to `/api/v1` — see
`packages/frontend/src/config/env.ts`), putting Nginx in front of both the
static build and the API on the same origin avoids CORS entirely in
production. This mirrors the local dev setup, where Vite's dev server
proxies `/api` to `http://localhost:3000` (`packages/frontend/vite.config.ts`).

## 2. Prerequisites

- Docker Engine 24+ and Docker Compose v2 (`docker compose`, not the
  legacy `docker-compose`).
- A PostgreSQL 15+ instance (containerized here, or a managed service —
  RDS, Cloud SQL, etc.).
- A domain/certificate for TLS termination at Nginx (Let's Encrypt via
  `certbot`, or terminate TLS at an upstream load balancer instead and run
  Nginx on plain HTTP internally).
- Secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DB_PASSWORD`,
  and the bootstrap admin credentials (see [`ENVIRONMENT.md`](ENVIRONMENT.md)).

## 3. Backend Dockerfile

Multi-stage build — compile TypeScript in a build stage, ship only
`dist/` + production `node_modules` in the runtime stage.

`packages/backend/Dockerfile`:

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

Build and run standalone:

```bash
cd packages/backend
docker build -t iam-backend:latest .
docker run --env-file .env -p 3000:3000 iam-backend:latest
```

## 4. Frontend Dockerfile

Build the Vite bundle, then serve the static files with Nginx. Frontend
build script already runs a type-check (`tsc --noEmit`) before `vite build`.

`packages/frontend/Dockerfile`:

```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Same-origin API in production — leave VITE_API_BASE_URL unset to use
# the default '/api/v1', which Nginx will proxy to the backend.
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## 5. Nginx reverse proxy configuration

`deploy/nginx.conf` — serves the React SPA, proxies `/api/` to the backend
container, and adds the health-check-friendly headers. Assumes the frontend
and backend run as separate containers on a shared Docker network (service
names `frontend` and `backend` below); adjust `proxy_pass` to a real
hostname/IP if Nginx runs outside Docker.

```nginx
upstream iam_backend {
    server backend:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    # Redirect all HTTP to HTTPS in production (terminate TLS here or
    # upstream at a load balancer — pick one, not both).
    # return 301 https://$host$request_uri;

    client_max_body_size 10m;      # asset CSV import / photo uploads
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # ---- React SPA ----
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache";
    }

    # Long-cache hashed static assets emitted by Vite.
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # ---- Backend API ----
    location /api/ {
        proxy_pass http://iam_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 5s;
    }

    # Liveness/readiness probes (no auth, lightweight).
    location = /api/v1/health/live {
        proxy_pass http://iam_backend;
        access_log off;
    }
}

# ---- HTTPS (recommended) ----
# server {
#     listen 443 ssl http2;
#     server_name your-domain.example;
#     ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     # ... same location blocks as above ...
# }
```

Notes:

- The backend already sets security headers via `helmet()`
  (`src/main.ts`) and enables CORS with `credentials: true` — with
  same-origin deployment through this Nginx config, CORS is not exercised
  in practice, but `CORS_ORIGIN` should still be set to your real origin
  as a defense-in-depth measure.
- `client_max_body_size` must comfortably exceed the asset bulk-import CSV
  cap (5 MB, enforced in `BulkImportDto`) plus any multipart overhead.

## 6. Docker Compose (single-host reference)

`docker-compose.yml` at the repo root:

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: iam
      POSTGRES_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD}
      POSTGRES_DB: iam
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U iam"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./packages/backend
    restart: unless-stopped
    env_file:
      - ./packages/backend/.env
    environment:
      DB_HOST: db
      DB_PORT: "5432"
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health/live"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  frontend:
    build:
      context: ./packages/frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  db-data:
```

Bring the stack up, run migrations, and verify health:

```bash
docker compose up -d --build
docker compose exec backend npm run migration:run
curl -f http://localhost/api/v1/health
```

## 7. Environment setup

Populate `packages/backend/.env` (or inject the equivalent variables via
your orchestrator's secret/env mechanism) before starting the backend
container. See [`ENVIRONMENT.md`](ENVIRONMENT.md) for the full variable
reference and the production checklist. Minimum production-critical set:

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=https://your-domain.example
DB_HOST=db
DB_PORT=5432
DB_USER=iam
DB_PASSWORD=<strong-unique-secret>
DB_NAME=iam
DB_SSL=false            # true if using a managed Postgres requiring TLS
JWT_ACCESS_SECRET=<48+ random chars>
JWT_REFRESH_SECRET=<48+ random chars>
BOOTSTRAP_ADMIN_EMAIL=admin@your-domain.example
BOOTSTRAP_ADMIN_PASSWORD=<temporary strong password>
```

For the frontend build, only set `VITE_API_BASE_URL` if the API is **not**
same-origin with the frontend (e.g. a separate API subdomain) — otherwise
leave it unset to use the `/api/v1` default that Nginx proxies.

## 8. Database migrations

The backend uses the TypeORM CLI against `src/config/data-source.ts`
(`synchronize: false` — schema changes are **only** applied via
migrations, never auto-sync). Migration files live in
`packages/backend/src/migrations/`.

Run migrations as part of every deploy, **before** starting/rolling the
new backend version if the migration is additive, or with the appropriate
expand/contract sequencing if it changes existing columns:

```bash
# From packages/backend, with the target DB_* env vars in scope:
npm run migration:run

# Roll back the most recently applied migration if needed:
npm run migration:revert

# Generate a new migration from entity changes during development:
npm run migration:generate -- src/migrations/<DescriptiveName>
```

In Docker Compose, run this inside the backend container/image (it has
`ts-node` and the TypeORM CLI as dev dependencies bundled into the image,
or run it as a one-off job using the build-stage image that still has
`node_modules` with devDependencies):

```bash
docker compose run --rm backend npm run migration:run
```

**Recommended pipeline order per release:**

1. Deploy database migrations (`migration:run`) against production.
2. Roll out the new backend image.
3. Roll out the new frontend image.
4. Verify `/api/v1/health` reports `"status": "ok"`.

The initial migration (`1720000000000-InitialAuthSchema`) also seeds the
five fixed roles and the base permission catalogue — this is what makes
the [bootstrap admin](ADMIN_GUIDE.md#bootstrap-admin-account) creation
possible on first boot. Running migrations is a required first step on a
brand-new database, not optional.

## 9. Health check verification

Two public, unauthenticated endpoints exist specifically for
orchestrator/load-balancer probes (`src/common/controllers/health.controller.ts`):

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /api/v1/health` | Readiness | Executes `SELECT 1` against PostgreSQL. Returns HTTP 200 always; inspect the JSON `status` field (`"ok"` vs `"degraded"`) — don't rely on the HTTP status code alone. |
| `GET /api/v1/health/live` | Liveness | Returns `{ "status": "ok" }` without touching the database — use for process-alive checks (e.g. container restart policies). |

Manual verification after deploy:

```bash
curl -s https://your-domain.example/api/v1/health | jq
# {
#   "status": "ok",
#   "timestamp": "2026-07-16T09:00:00.000Z",
#   "checks": { "database": "ok" }
# }

curl -s https://your-domain.example/api/v1/health/live
# {"status":"ok"}
```

Wire `health/live` into your container's `HEALTHCHECK`/liveness probe (as
shown in the Compose file above) and `health` into your load balancer's
readiness/target-group health check so traffic is only routed to backend
instances that can reach the database.

## 10. Recommended production settings

- **Process management:** run the backend under a supervisor that
  restarts on crash (Docker `restart: unless-stopped`, Kubernetes
  Deployment, systemd, or PM2) — `app.enableShutdownHooks()` is already
  enabled in `main.ts` so `SIGTERM` triggers a graceful NestJS shutdown.
- **TLS:** terminate HTTPS at Nginx (or an upstream load balancer) —
  never serve the API or SPA over plain HTTP in production.
- **Secrets:** never bake `JWT_ACCESS_SECRET` / `DB_PASSWORD` into the
  Docker image; inject at runtime via env vars, Docker secrets, or a
  secret manager (Vault, AWS Secrets Manager, etc.).
- **Database:** enable automated backups (see
  [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md#backuprestore-procedures)); run
  PostgreSQL with connection pooling (PgBouncer) if you expect high
  backend replica counts.
- **Scaling:** the backend is stateless (JWT + DB-backed refresh tokens),
  so it can be horizontally scaled behind Nginx/a load balancer without
  sticky sessions. Ensure all replicas point at the same PostgreSQL
  instance and share the same `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`.
- **Logging:** the `LoggingInterceptor` and `GlobalExceptionFilter`
  already tag every request/error with a correlation ID — ship container
  stdout/stderr to a centralized log aggregator (ELK, CloudWatch, Loki) and
  index on `correlationId` for tracing.
- **Rate limiting:** review `THROTTLE_LIMIT_GLOBAL` / `THROTTLE_LIMIT_AUTH`
  against real traffic; consider additional rate limiting at Nginx/CDN for
  defense in depth (`limit_req_zone` in Nginx, or a WAF).
- **CORS:** set `CORS_ORIGIN` to the exact production origin even when
  same-origin via Nginx, as a safety net if the deployment topology
  changes later.
- **Monitoring:** poll `/api/v1/health` on an interval separate from the
  load balancer (e.g. an external uptime monitor) so database
  connectivity issues are caught even if the LB itself is misconfigured.
