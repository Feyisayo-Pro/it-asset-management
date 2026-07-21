# Developer Setup Guide

Local development setup for the IT Asset Lifecycle Management platform — a
monorepo with an NestJS backend (`packages/backend`) and a React/Vite
frontend (`packages/frontend`).

## 1. Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 18+ | 20.x recommended (matches the backend/frontend Docker images in [`DEPLOYMENT.md`](DEPLOYMENT.md)). |
| PostgreSQL | 15+ | Local install, or run via Docker (see below). |
| pnpm | 8+ | Workspace-aware package manager for this monorepo. |
| git | any recent | |

> The repo also contains a `package-lock.json` and uses `npm --workspace`
> in its root `package.json` scripts, so plain `npm install` /
> `npm run <script>` work as a drop-in alternative to the `pnpm` commands
> below if you prefer npm. Don't mix lockfiles in the same clone — pick one
> package manager and stick with it.

Quick PostgreSQL via Docker, if you don't want a local install:

```bash
docker run --name iam-postgres -e POSTGRES_USER=iam -e POSTGRES_PASSWORD=iam \
  -e POSTGRES_DB=iam -p 5432:5432 -d postgres:15-alpine
```

## 2. Clone and install

```bash
git clone <repository-url> it-asset-management
cd it-asset-management
pnpm install    # installs both packages/backend and packages/frontend
```

Monorepo layout:

```
it-asset-management/
├── package.json            # workspace root — pnpm/npm workspace scripts
├── packages/
│   ├── backend/            # NestJS API
│   └── frontend/           # React SPA
└── docs/                   # this documentation set
```

## 3. Database setup

The backend does **not** use TypeORM `synchronize` — schema is entirely
migration-driven (`src/config/data-source.ts` sets `synchronize: false`).

1. Ensure a PostgreSQL 15+ instance is reachable with a database and user
   matching your `.env` (defaults: db `iam`, user `iam`, password `iam`,
   host `localhost`, port `5432`).
2. Create the `.env` file (next section).
3. Run migrations (section 5) — this creates every table **and** seeds
   the five RBAC roles + the full permission catalogue. Nothing works
   without this step on a fresh database.

## 4. Environment file

```bash
cd packages/backend
cp .env.example .env
```

Edit `.env` and at minimum set real JWT secrets (the app refuses to boot
without `JWT_ACCESS_SECRET` — Joi validation fails fast) and a bootstrap
admin so you have a way to log in:

```bash
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
BOOTSTRAP_ADMIN_EMAIL=admin@local.test
BOOTSTRAP_ADMIN_PASSWORD=ChangeMeNow123!
```

See [`ENVIRONMENT.md`](ENVIRONMENT.md) for the full variable reference.
The frontend needs no `.env` for local dev — Vite's dev server proxies
`/api/*` straight to `http://localhost:3000` (`packages/frontend/vite.config.ts`),
matching the backend's default `API_PREFIX=api/v1`.

## 5. Running migrations

From `packages/backend`:

```bash
npm run migration:run        # apply all pending migrations
npm run migration:revert     # roll back the most recent migration
npm run migration:generate -- src/migrations/<Name>   # after entity changes
```

Or from the repo root using the workspace script:

```bash
pnpm run backend:migration:run
```

On success you'll have the full schema plus the seeded `roles` /
`permissions` / `role_permissions` tables described in
[`ADMIN_GUIDE.md`](ADMIN_GUIDE.md#rbac-configuration).

## 6. Starting the dev servers

Run backend and frontend in separate terminals (both support hot reload).

**Backend** — NestJS watch mode, listens on `:3000` (`PORT` env var):

```bash
cd packages/backend
npm run start:dev
# or from repo root: pnpm run backend:start:dev
```

On first boot with `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` set
and an empty `users` table, a `SUPER_ADMIN` account is created
automatically — log in with those credentials
(`mustChangePassword` will be `true`, so you'll be prompted to set a new
password immediately).

**Frontend** — Vite dev server, listens on `:5173`:

```bash
cd packages/frontend
pnpm run dev
```

Open `http://localhost:5173`. API calls to `/api/v1/*` are proxied to the
backend on `:3000` by Vite automatically — no CORS configuration needed
for local dev.

Verify the backend is healthy at any time:

```bash
curl http://localhost:3000/api/v1/health/live
curl http://localhost:3000/api/v1/health
```

## 7. Running tests

**Backend** (Jest, from `packages/backend`):

```bash
npm run test              # full suite (unit + integration)
npm run test:unit         # unit tests only — no DB required
npm run test:integration  # integration tests — requires a running Postgres
npm run test:cov          # with coverage report
npm run typecheck         # tsc --noEmit
```

Unit tests live in `packages/backend/test/unit/<module>/`, one directory
per feature module (`auth`, `asset`, `return`, `assessment`, `repair`,
`disposal`, `dashboard`, `notification`, `rbac`, `audit`, `workflow`,
`common`), plus `test/unit/fakes/` for shared in-memory test doubles.
Integration tests live in `packages/backend/test/integration/` and talk to
a real PostgreSQL instance (point `.env`/`DB_*` at a disposable test
database before running these).

**Frontend** (Vitest, from `packages/frontend`):

```bash
pnpm run test         # single run
pnpm run test:watch   # watch mode
pnpm run typecheck    # tsc --noEmit
```

## 8. Project structure overview

### Backend (`packages/backend/src`)

Clean-Architecture-style module layout — each feature module under
`src/modules/<name>/` is split into:

```
modules/<name>/
├── domain/            # entities, value objects, domain errors/events
├── application/       # use cases + ports (interfaces) the domain depends on
├── infrastructure/     # TypeORM repositories, adapters implementing ports
└── presentation/       # controllers + DTOs (the HTTP surface, see API.md)
```

Feature modules: `auth`, `rbac`, `audit`, `asset`, `workflow`, `return`,
`assessment`, `repair`, `disposal`, `notification`, `reporting`,
`dashboard`.

Cross-cutting code lives in `src/common/`:

```
common/
├── controllers/    # health.controller.ts
├── decorators/      # @Public, @Roles, @RequirePermissions, @CurrentUser, @ThrottleAuth
├── guards/          # JwtAuthGuard, RbacGuard (both global — see API.md)
├── filters/          # GlobalExceptionFilter (error envelope)
├── interceptors/      # LoggingInterceptor (correlation-id logging)
├── middleware/        # correlation-id middleware
├── errors/            # domain/application error base classes + per-module errors
├── events/            # event bus wiring (@nestjs/event-emitter)
└── utils/             # async-local request context, etc.
```

Other top-level backend files: `src/main.ts` (bootstrap), `src/app.module.ts`
(module wiring + global providers), `src/config/` (`configuration.ts`,
`validation.schema.ts`, `data-source.ts` — see [`ENVIRONMENT.md`](ENVIRONMENT.md)),
`src/migrations/` (TypeORM migrations, chronologically named).

### Frontend (`packages/frontend/src`)

```
src/
├── api/          # one *.api.ts per backend module — thin axios wrappers + query-keys.ts
├── components/   # shared/reusable UI components
├── config/       # env.ts (VITE_API_BASE_URL, app name)
├── features/     # feature-sliced UI: admin, assets, assessments, auth,
│                 # dashboard, disposals, notifications, repairs, reports, returns
├── hooks/        # shared React hooks
├── layouts/      # app shell / page layout components
├── pages/        # route-level page components
├── routes/       # React Router route definitions + role-based guards
├── stores/       # Zustand stores (client state, e.g. auth session)
└── types/        # shared TypeScript types
```

State/data-fetching conventions: server state (assets, returns, etc.) is
managed with TanStack Query against the `api/*.api.ts` clients; client-only
state (current session, UI preferences) is managed with Zustand stores
under `src/stores/`.

## 9. Common gotchas

- **"Config value ... is not a number" / boot fails immediately:** a
  numeric env var (e.g. `PORT`, `DB_PORT`) has a non-numeric value, or a
  required var like `JWT_ACCESS_SECRET` is missing/too short (<32 chars).
  See [`ENVIRONMENT.md`](ENVIRONMENT.md).
- **Can't log in after a fresh DB:** confirm migrations ran
  (`npm run migration:run`) *before* the backend's first boot with
  `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` set — the bootstrap
  routine only fires when the `roles` table already has a `SUPER_ADMIN`
  row (seeded by the first migration) and `users` is empty.
- **CORS errors in the browser:** only happens if you bypass the Vite
  proxy (e.g. calling the backend directly on `:3000` from browser code).
  Use the proxied `/api/v1/...` paths, or set `CORS_ORIGIN` on the backend
  to match wherever the frontend is actually being served from.
- **Integration tests hang/fail:** they need a real reachable PostgreSQL —
  check `DB_HOST`/`DB_PORT`/credentials in the environment the test run
  inherits, and that migrations have been applied to that database.
