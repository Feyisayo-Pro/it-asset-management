# Deployment Playbook

Step-by-step instructions to stand up the IT Asset Management platform —
PostgreSQL 16, the NestJS backend, and the React/nginx frontend — from a
clean environment through to a running, seeded system.

Two paths are documented: **Docker Compose** (recommended — this is what's
actually tested end-to-end, see [Verification](#verification-notes) below)
and **manual / bare-metal**, for environments that don't use Docker. Both
converge on the same three commands that matter: run migrations, seed the
baseline inventory, verify health.

Related docs: [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) for what's
actually running under the hood, [`CLAUDE.md`](../CLAUDE.md) for
conventions to preserve if you're extending this deployment setup rather
than just running it, [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md)
for the broader pre-deploy checklist (security, monitoring, etc. — this
playbook only covers *standing the system up*).

---

## 1. Prerequisites

- Docker + Docker Compose v2 (`docker compose version`), **or** Node.js 20
  and a PostgreSQL 16 instance you provision yourself.
- The repo cloned, at the path this playbook assumes is the repo root
  (`it-asset-management-claude-enterprise-spec-review-p7f52r/`).

> **Know which directory is actually the repo root before running any
> command below.** In at least one working copy of this project, the repo
> was extracted/cloned into a folder of the *same name* one level up
> (`.../it-asset-management-claude-enterprise-spec-review-p7f52r/it-asset-management-claude-enterprise-spec-review-p7f52r/`),
> and a stray, empty, self-nesting `it-asset-management/` folder existed
> alongside it at the outer level. `docker-compose.yml` lives at the real
> repo root — the *inner* folder, the one that also has `package.json`,
> `packages/`, and `docs/` directly inside it — **not** in a `docker/`
> subfolder, and it does not need a symlink. Running `docker compose`
> commands from one level too high produces exactly `no configuration
> file provided: not found`; this was confirmed live and is not a
> misplaced-file problem. If you hit that error, `cd` into the directory
> that directly contains `docker-compose.yml` (`pwd` after `cd` should end
> in the repo's own name) before retrying, or use `docker compose
> -f <path-to-repo-root>/docker-compose.yml --project-directory
> <path-to-repo-root> ...` from wherever you are. Ignore any
> `it-asset-management/` folder that doesn't directly contain
> `docker-compose.yml` and `packages/` — in the working copy above it was
> a dead, recursively self-nesting artifact with no real source in it.

- The real baseline inventory workbook is already checked into the repo at
  `packages/backend/src/database/seeds/source-data/phone-and-laptop-update-2026-07-14.xlsx`
  — no separate file transfer needed for a normal deploy. Only override
  this if you have a newer export (see [§6](#6-full-inventory-seed)).

---

## 2. Environment Variable Configuration

There are **three separate `.env.example` files** — they are not
interchangeable:

| File | Used by | When |
|---|---|---|
| [`/.env.example`](../.env.example) | `docker-compose.yml` | Copy to `/.env` for the Compose path (§3) |
| [`packages/backend/.env.example`](../packages/backend/.env.example) | Backend running directly on the host | Copy to `packages/backend/.env` for the manual path (§4) |
| [`packages/frontend/.env.example`](../packages/frontend/.env.example) | Vite build (`npm run dev` / `npm run build`) | Copy to `packages/frontend/.env` for the manual path |

Every value in these files that says `change-me` **must** be replaced
before anything beyond local dev — most importantly:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — must be 32+ characters;
  the app refuses to boot without a valid `JWT_ACCESS_SECRET` (Joi
  validation in `config/validation.schema.ts`). Generate with e.g.
  `openssl rand -base64 48`.
- `POSTGRES_PASSWORD` (Compose path) / `DB_PASSWORD` (manual path).
- `CORS_ORIGIN` — set to wherever the frontend is actually served from.
  With the bundled Compose/nginx setup this rarely matters (the SPA calls
  the API same-origin through the nginx reverse proxy) — it matters if a
  browser hits the backend directly, or the frontend is deployed
  elsewhere.

The Compose file (`docker-compose.yml`) enforces this at startup: it uses
`${VAR:?message}` for `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and
`JWT_REFRESH_SECRET` — `docker compose up` fails immediately with a clear
error if `.env` wasn't set up, rather than booting with weak defaults.

---

## 3. Docker Compose Path (recommended)

```bash
cp .env.example .env
# edit .env — at minimum set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

docker compose up -d --build
```

This builds and starts, in dependency order:

1. **`postgres`** (postgres:16-alpine) — waits for `pg_isready` before
   anything else proceeds.
2. **`migrate`** — a one-shot job built from the same backend image, runs
   `node node_modules/typeorm/cli.js migration:run -d packages/backend/dist/config/data-source.js`
   against the compiled `dist` build, then exits. `backend` will not start
   until this container exits successfully
   (`depends_on: migrate: condition: service_completed_successfully`) —
   schema setup never races app boot.
3. **`backend`** — starts once migrations succeed; its Dockerfile
   `HEALTHCHECK` polls `/api/v1/health/live` internally.
4. **`frontend`** — nginx serving the built SPA, reverse-proxying `/api/`
   to the `backend` service; waits for `backend` to report healthy.

Default host ports (override in `.env`): backend `3000`, frontend `8080`,
postgres `5432`.

The `migrate` service only runs schema migrations — it does **not** seed
data. Run the inventory seed as a separate, explicit step (§6) once the
stack is up (or as a one-off before it's up — `run` doesn't require
`backend` to already be running). The container's `WORKDIR` is `/app`,
and the backend's compiled output lives at `packages/backend/dist`
inside it (see the `Dockerfile`), so the full path is required — run
from the directory that directly contains `docker-compose.yml` (see the
callout in §1 if you hit "no configuration file provided"):

```bash
# Dry run — no DB access, safe to run any time
docker compose run --rm backend node packages/backend/dist/database/seeds/seed-full-inventory.js --dry-run

# Real run
docker compose run --rm backend node packages/backend/dist/database/seeds/seed-full-inventory.js
```

`docker compose exec backend ...` is the alternative if the long-lived
`backend` service from `docker compose up` is already running and you'd
rather reuse that container instead of spinning up a one-off with `run`.

> The compiled `dist` output is what's actually running in the container —
> the production image only has compiled JS + prod `node_modules`, not
> `ts-node` or dev dependencies, so this uses the compiled `.js` entry
> point directly rather than `npm run seed:inventory:full` (which invokes
> `ts-node`, not present in that image). This also means the `.xlsx`
> source file has to actually survive the TypeScript build — it does,
> via `nest-cli.json`'s `compilerOptions.assets` entry, which copies
> `database/seeds/source-data/**/*` into `dist/` alongside the compiled
> `.js` files.
>
> **Verified live, end to end, including the failure mode that motivated
> this note**: `docker compose run --rm backend node
> packages/backend/dist/database/seeds/seed-full-inventory.js --dry-run`
> first failed with `Cannot find module
> '/app/packages/backend/dist/database/seeds/seed-full-inventory.js'` —
> not because the path was wrong, but because `docker compose run` reuses
> a cached image for the `backend` service if one already exists, and the
> cached image predated the `nest-cli.json` asset-copying fix. Running
> `docker compose build backend migrate` first (or `docker compose up
> --build`, which always rebuilds) resolved it — the retry produced the
> identical `209 asset(s)` result as running the compiled script outside
> Docker. **If you see that `Cannot find module` error, rebuild the image
> before assuming the path is wrong.**

To tear down: `docker compose down` (add `-v` to also drop the
`postgres_data` volume — **destroys all data**, only do this for a
throwaway environment).

---

## 4. Manual / Bare-Metal Path

Use this if you're not using Docker — e.g. deploying the backend directly
to a VM or a platform that runs `node dist/main.js` itself.

```bash
# 1. Install dependencies (npm workspaces — installs both packages)
npm ci

# 2. Provision PostgreSQL 16 yourself and note host/port/user/password/db name

# 3. Configure the backend
cp packages/backend/.env.example packages/backend/.env
# edit packages/backend/.env — DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME,
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, etc.

# 4. Run migrations (see §5 for exact command + working directory)

# 5. Seed the baseline inventory (see §6)

# 6. Build and start the backend
npm run backend:build
npm run backend:start
# (or, from packages/backend/: npm run build && npm run start)

# 7. Build and serve the frontend
cp packages/frontend/.env.example packages/frontend/.env
# VITE_API_BASE_URL defaults to /api/v1 (relative) — only change this if
# the frontend and backend are on different origins.
npm run frontend:build
# packages/frontend/dist/ is now a static site — serve it with any static
# file server / CDN / reverse proxy of your choice. There is no bundled
# nginx config for a non-Docker deploy; packages/frontend/nginx.conf is
# written specifically for the Docker image's non-root nginx setup and
# assumes a "backend" hostname resolvable via Docker's embedded DNS — it
# will not work unmodified outside Compose.
```

---

## 5. Running Migrations

**Command** (must run from `packages/backend/`, or via the root convenience
script):

```bash
# from the repo root
npm run backend:migration:run

# equivalently, from packages/backend/
npm run migration:run
```

This runs `typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts`
— every file in `packages/backend/src/migrations/`, in timestamp order,
each wrapped in its own transaction. As of this writing that includes the
full asset/auth/RBAC schema, the Device Assessment module, and the two
most recent migrations:
`RefactorAssetSchemaAndIndexes1721100000000` (index hygiene, safe to
re-run — see [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md)) and
`ReconcileDeviceAssessmentChecklist1721200000000` (the 8-item checklist —
see [`SYSTEM_ARCHITECTURE.md` §2](SYSTEM_ARCHITECTURE.md#2-device-assessment-module)).

To revert the most recently applied migration: `npm run migration:revert`
(same working-directory rule applies). Reverting is a one-migration-at-a-time
operation — run it repeatedly to step back further.

**Idempotency**: migrations are tracked in the `migrations` table; running
`migration:run` again when everything is already applied is a safe no-op
(TypeORM checks the table and skips anything already recorded).

---

## 6. Full Inventory Seed

```bash
# from packages/backend/
npm run seed:inventory:full
```

This parses `source-data/phone-and-laptop-update-2026-07-14.xlsx` (both the
`LAPTOPS` and `PHONES` sheets) and writes **all ~136 laptop + ~73 phone
records** as `Asset` rows, walking each one through the real
`AssetLifecycleStateMachine` transitions rather than writing status
directly (Registration → Available → target status). See
[`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) for what the source data
actually looks like and how messy/free-text fields get mapped.

**This must run *after* migrations (§5)** — it depends on the `assets` and
`asset_status_history` tables existing.

**Idempotent by design, not by accident**: each row's `Asset.id` is a
deterministic `uuid v5`, derived from the source sheet name + the
spreadsheet's own row number (not from parsed content, so it stays stable
even if the parsing logic is later improved). Before writing anything for a
row, the script checks `findById` and skips if that id already exists.
This check is load-bearing, not just an optimization: `asset_status_history`
is intentionally insert-only (see
[`SYSTEM_ARCHITECTURE.md` §5](SYSTEM_ARCHITECTURE.md#5-immutable-audit-history-asset_status_history)),
so a naive re-run that tried to upsert history rows would throw a
primary-key violation on the second run. Re-running this command against
an already-seeded database is safe — it will report `Seeded 0 new
asset(s), skipped 209 already-seeded.` and make no writes.

**Overriding the source file**: if you have a newer export, either replace
`source-data/phone-and-laptop-update-2026-07-14.xlsx` in place, or point at
a different file without touching the repo:

```bash
INVENTORY_XLSX_PATH="/path/to/newer-export.xlsx" npm run seed:inventory:full
```

The workbook must have sheets literally named `LAPTOPS` and `PHONES`; the
script reads only those two (other sheets in the real export, e.g.
`LAPTOP CHARGERS UPDATE`, are ignored).

### Expected output

```
Read 136 laptop row(s) and 73 phone row(s) from .../phone-and-laptop-update-2026-07-14.xlsx

Prepared 209 asset(s): 136 laptop(s), 73 phone(s).
  Allocated: 117
  Available: 60
  UnderRepair: 10
  Unaccounted: 15
  Stolen: 7

Seeded 209 new asset(s), skipped 0 already-seeded.
Total rows in source: 209; parsed: 209; unparseable: 0.
```

These exact numbers (209 = 136 + 73, the status breakdown, zero
unparseable rows) were confirmed by actually running this command against
a live PostgreSQL 16 instance — not predicted. If your run reports
`unparseable` rows, warnings, or a device/status split that doesn't match
this, treat that as a signal something about the source file changed —
see the [Troubleshooting](#troubleshooting) section.

---

## 7. Dry Runs — Validate Before Staging/Production

```bash
# from packages/backend/
npm run seed:inventory:full:dry-run
```

Runs the exact same parsing pipeline as §6 — reads the workbook, parses
every row, applies the same brand/serial/status heuristics, builds the
same in-memory `Asset` domain objects and walks the same state-machine
transitions — but **stops before any database connection is made**. No
`AppDataSource.initialize()` call happens in dry-run mode at all.

Use this:

- **Before every staging/production run of §6**, especially the first time
  against a new or updated source workbook. A dry run against a completely
  different/newer export will surface parsing warnings before you touch a
  real database.
- **After editing the parsing heuristics**
  (`packages/backend/src/database/seeds/lib/inventory-xlsx-parser.ts`) —
  run it against the checked-in source file to confirm the 209/0-warnings
  baseline hasn't regressed.
- **Whenever the workbook's status/serial formatting is unfamiliar** — the
  script prints a `WARN:` line for every row where a heuristic had to
  guess (not raise a value with full confidence) and a `SKIP:` line for
  every row it couldn't parse at all (missing a required field). Zero of
  either is the expected baseline for the checked-in file; anything else
  means either the source data changed or the parser needs updating.

Dry-run output ends with `[DRY RUN] No database writes performed.` and
never prints a `Seeded ... / skipped ...` line (that only appears after an
actual write attempt).

---

## 8. Post-Deploy Verification

```bash
# Direct backend health check (works without the frontend/proxy)
curl http://localhost:3000/api/v1/health
# => {"status":"ok","timestamp":"...","checks":{"database":"ok"}}

curl http://localhost:3000/api/v1/health/live
# => {"status":"ok"}

# Swagger / OpenAPI docs — mounted outside the API prefix, always at /api/docs
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:3000/api/docs
# => 200

# Through the frontend's nginx reverse proxy (Compose path only)
curl http://localhost:8080/api/v1/health/live
```

If `checks.database` isn't `"ok"`, the backend booted but can't reach
Postgres — check `DB_HOST`/`DB_PORT` (in the Compose path, `DB_HOST` must
be the service name `postgres`, not `localhost`) and that migrations
actually completed.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker compose ...` fails with `no configuration file provided: not found` | Run from one directory too high — see the callout in §1. This is a "wrong working directory" error, `docker-compose.yml` is not misplaced | `cd` into the directory that directly contains `docker-compose.yml`, or pass `-f <path>/docker-compose.yml --project-directory <path>` |
| `docker compose run`/`exec backend node packages/backend/dist/...` fails with `Cannot find module '/app/packages/backend/dist/...'` | Stale cached image for the `backend`/`migrate` service, built before a source change (e.g. before the `nest-cli.json` asset-copying fix) — `docker compose run` does not rebuild automatically | `docker compose build backend migrate` (or `docker compose up --build`), then retry |
| `docker compose up` fails immediately with a `variable is not set` error | `.env` wasn't created, or is missing `POSTGRES_PASSWORD`/`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` | `cp .env.example .env` and fill in the required values (§2) |
| Backend container exits immediately, logs mention JWT/config validation | `JWT_ACCESS_SECRET` shorter than 32 characters, or unset | Generate a real secret (§2) |
| `seed:inventory:full` errors with `ENOENT` opening the xlsx file | Source file missing or `INVENTORY_XLSX_PATH` points somewhere wrong | Confirm `packages/backend/src/database/seeds/source-data/phone-and-laptop-update-2026-07-14.xlsx` exists, or set `INVENTORY_XLSX_PATH` correctly |
| Seed run reports rows under `SKIP:` | Row is missing a required field in the source sheet (model/serial, department, status, or IMEI) | Expected to be zero for the checked-in file — if non-zero, the workbook changed; inspect the named rows directly in the sheet |
| Seed run reports `Seeded 0 new asset(s), skipped 209 already-seeded` when you expected fresh writes | This is correct, not a bug — the seed is idempotent (§6). If you actually want to reseed from scratch, that means clearing the `assets`/`asset_status_history` tables first, which is destructive — do this deliberately, not by accident |
| `docker compose up` hangs waiting on `frontend`, then fails with a port conflict | Something else on the host is already using `FRONTEND_PORT` (default 8080) — this happened during development against an unrelated container | Set a different `FRONTEND_PORT` in `.env` |
| Frontend loads but API calls 502 | `backend` isn't healthy yet, or nginx's DNS resolution to the `backend` service hasn't caught up (see `packages/frontend/nginx.conf`'s `resolver` comment) | Check `docker compose ps` — `backend` should show `healthy`; check `docker compose logs backend` |

---

## Verification Notes

Everything in §3, §5, §6, and §7 of this playbook was run for real against
a live PostgreSQL 16 container during development of this system — not
just written from reading the code. That included: a full `docker compose
up` bringing all four services to a healthy/running state; migrations run
against a clean database; the full inventory seed run twice in a row to
confirm the idempotency claim in §6; the dry-run path confirmed to make
zero database connections; and, separately, the exact `docker compose run
--rm backend node packages/backend/dist/database/seeds/seed-full-inventory.js
--dry-run` invocation from §3/§6, confirmed both as a `MODULE_NOT_FOUND`
failure against a stale cached image and as a clean `209 asset(s)` success
after rebuilding — both Troubleshooting-table entries above reflect errors
actually reproduced, not anticipated. See
[`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) for the architectural
detail behind *why* several of these steps behave the way they do (the
state-machine-respecting seed writes, the insert-only audit history, the
migration ordering).
