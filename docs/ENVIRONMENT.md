# Environment Variables

Reference for every environment variable consumed by the backend
(`packages/backend`). Sourced from:

- `packages/backend/src/config/validation.schema.ts` — the Joi schema that
  `ConfigModule` validates on boot (`validationOptions: { abortEarly: true }`).
  **The process refuses to start if a required variable is missing or a
  value fails validation.**
- `packages/backend/src/config/configuration.ts` — `loadConfiguration()`,
  which reads `process.env` (with its own fallbacks) into the strongly
  typed `RootConfig` object injected everywhere via `ConfigService`.
- `packages/backend/.env.example` — the checked-in template.

Variables are grouped by the config section they populate. All variables
are plain strings at the OS/env level; "Type" below is the *logical* type
after Joi/`configuration.ts` parsing.

## How to set them

Copy the template and edit secrets:

```bash
cd packages/backend
cp .env.example .env
```

`ConfigModule.forRoot()` loads `.env` then `.env.local` (later files
override earlier ones) — see `envFilePath: ['.env', '.env.local']` in
`src/app.module.ts`. In containerized/production deployments, prefer
injecting real environment variables (Docker secrets, orchestrator env,
etc.) over shipping a `.env` file — see [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Application (`app`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | enum: `development`\|`test`\|`production` | No | `development` | Runtime environment; also controls TypeORM query logging verbosity (`error,warn` in dev, `error` only otherwise). |
| `PORT` | number (valid port) | No | `3000` | TCP port the Nest HTTP server listens on. |
| `API_PREFIX` | string | No | `api/v1` | Global route prefix (`app.setGlobalPrefix(...)`); every documented endpoint in [`API.md`](API.md) is mounted under this. |
| `CORS_ORIGIN` | string (URL/origin) | No | `http://localhost:5173` | Single allowed CORS origin, passed to `app.enableCors({ origin, credentials: true })`. Set to your deployed frontend origin in production. |

## Database (`database`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `DB_HOST` | string | No | `localhost` | PostgreSQL host. |
| `DB_PORT` | number (valid port) | No | `5432` | PostgreSQL port. |
| `DB_USER` | string | No | `iam` | PostgreSQL username. |
| `DB_PASSWORD` | string | No | `iam` | PostgreSQL password. **Always override in any non-local environment.** |
| `DB_NAME` | string | No | `iam` | Database name. |
| `DB_SSL` | string enum: `'true'`\|`'false'` | No | `'false'` | Enables `ssl: true` on the TypeORM connection. Set to `true` for managed Postgres providers that require TLS (e.g. RDS with `sslmode=require`). |

These feed both the runtime `TypeOrmModule.forRoot(dataSourceOptions)`
connection and the standalone `DataSource` used by the TypeORM CLI for
migrations (`src/config/data-source.ts`).

## JWT (`jwt`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `JWT_ACCESS_SECRET` | string, min 32 chars | **Yes** | — | HMAC signing secret for access tokens (HS256). Boot fails without it. |
| `JWT_REFRESH_SECRET` | string, min 32 chars | No (optional, may be empty) | `''` | Secret associated with refresh-token handling. Refresh tokens themselves are opaque random values hashed at rest (SHA-256), not JWTs — see `packages/backend/README.md` security notes. |
| `JWT_ACCESS_TTL_SECONDS` | integer, positive | No | `900` (15 min) | Access token lifetime. |
| `JWT_REFRESH_TTL_SECONDS` | integer, positive | No | `1209600` (14 days) | Refresh token lifetime. |
| `JWT_ISSUER` | string | No | `iam-backend` | JWT `iss` claim. |
| `JWT_AUDIENCE` | string | No | `iam-frontend` | JWT `aud` claim. |

**Generating a secret:** `openssl rand -base64 48` (or any generator that
yields ≥32 random characters).

## Account lockout (`lockout`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `LOGIN_MAX_ATTEMPTS` | integer, positive | No | `5` | Consecutive failed logins before an account is locked. |
| `LOGIN_LOCKOUT_MINUTES` | integer, positive | No | `15` | Lockout duration once `LOGIN_MAX_ATTEMPTS` is reached. |

## Password reset (`passwordReset`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `PASSWORD_RESET_TTL_MINUTES` | integer, positive | No | `30` | How long a password-reset token remains valid. |
| `PASSWORD_RESET_URL_BASE` | string (URI) | No | `http://localhost:5173/reset-password` | Base URL embedded in reset emails; the reset token is appended as a query/path param by the mail service. Set to your deployed frontend's reset-password route in production. |

## Rate limiting (`throttle`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `THROTTLE_TTL_SECONDS` | integer, positive | No | `60` | Sliding window size, in seconds, for both throttle buckets below. |
| `THROTTLE_LIMIT_GLOBAL` | integer, positive | No | `120` | Max requests per IP per window for the global (`default`) bucket, applied to every route via the global `ThrottlerGuard`. |
| `THROTTLE_LIMIT_AUTH` | integer, positive | No | `10` | Max requests per IP per window for the tighter `auth` bucket applied to `POST /auth/login`, `POST /auth/forgot-password`, and `POST /auth/reset-password` via `@ThrottleAuth()`. |

## Bootstrap admin (`bootstrap`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` | string (email), or empty | No | *(unset)* | If set **and** the `users` table is empty at boot, a `SUPER_ADMIN` account is created with this email. No-op on every subsequent boot. See [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md#bootstrap-admin-account). |
| `BOOTSTRAP_ADMIN_PASSWORD` | string, min 12 chars, or empty | No | *(unset)* | Initial password for the bootstrap admin. The account is created with `mustChangePassword = true`, forcing an immediate password change on first login. |

Both variables must be set together — the bootstrap routine is skipped
entirely if either is empty/absent.

## Variables present in `.env.example` but not read by the config loader

| Variable | Notes |
|---|---|
| `BCRYPT_COST` | Present in `.env.example` for historical/documentation purposes. Password hashing in this codebase uses **argon2id** (`argon2` package, `m=65536, t=3, p=4`), not bcrypt, and this value is not read by `validation.schema.ts` or `configuration.ts`. Safe to omit; kept here only to avoid confusion if you see it in the template. |

## Full `.env` template

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=iam
DB_PASSWORD=iam
DB_NAME=iam
DB_SSL=false

# JWT
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars-long
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars-long
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=1209600
JWT_ISSUER=iam-backend
JWT_AUDIENCE=iam-frontend

# Password / lockout policy
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

# Password reset
PASSWORD_RESET_TTL_MINUTES=30
PASSWORD_RESET_URL_BASE=http://localhost:5173/reset-password

# Rate limiting (per IP)
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT_GLOBAL=120
THROTTLE_LIMIT_AUTH=10

# Bootstrap super admin (created on first boot if no users exist)
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

## Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are unique, ≥32-char
      random values, different from any lower environment, and stored in a
      secret manager (not committed to version control).
- [ ] `DB_PASSWORD` is a strong, unique credential.
- [ ] `DB_SSL=true` if your PostgreSQL provider requires/prefers TLS.
- [ ] `CORS_ORIGIN` points at the exact production frontend origin
      (scheme + host + port), not `localhost`.
- [ ] `PASSWORD_RESET_URL_BASE` points at the production frontend's
      reset-password route.
- [ ] `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` are set for the
      very first deploy, then either left in place (it is a no-op once a
      user exists) or cleared — your choice, it is safe either way.
- [ ] Throttle limits (`THROTTLE_LIMIT_GLOBAL`, `THROTTLE_LIMIT_AUTH`)
      reviewed against expected traffic and behind any upstream reverse
      proxy / CDN rate limiting.
