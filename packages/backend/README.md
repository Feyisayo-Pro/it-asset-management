# @iam/backend

NestJS + TypeScript backend for the IT Asset Lifecycle Management platform.

## Setup

```bash
cp .env.example .env         # then edit secrets
npm install
```

## Scripts

- `npm run start:dev` — Nest watch mode
- `npm run start` — production process (after `npm run build`)
- `npm run build` — compile to `dist/`
- `npm run test` — full jest run
- `npm run test:unit` — unit tests only (no DB)
- `npm run test:integration` — integration tests (requires Postgres)
- `npm run typecheck` — `tsc --noEmit`
- `npm run migration:run` — apply DB migrations
- `npm run migration:revert` — roll back the last migration

## Modules landed so far (M2 — Foundation)

- `common/` — global kernel: correlation-id middleware, JWT + RBAC guards,
  global exception filter, logging interceptor, async-local request
  context, event bus.
- `modules/rbac/` — roles + permissions catalogue, `RbacService` with
  in-process cache, `@Roles()` / `@RequirePermissions()` decorators
  enforced by `RbacGuard`.
- `modules/auth/` — full Clean Architecture stack:
  - Domain: `User`, `RefreshToken`, `PasswordResetToken` aggregates
    with invariants, `PasswordPolicy` domain service, domain events.
  - Application: `LoginUseCase`, `RefreshTokenUseCase`, `LogoutUseCase`,
    `ForgotPasswordUseCase`, `ResetPasswordUseCase`,
    `ChangePasswordUseCase`, each depending only on ports
    (`PasswordHasher`, `TokenService`, `MailService`, `IdGenerator`,
    `Clock`).
  - Infrastructure: argon2id hasher, JWT + opaque-refresh-token service,
    logger-backed mail service, TypeORM repositories, bootstrap-admin
    on empty DB.
  - Presentation: `AuthController` with class-validator DTOs, throttled
    on login / forgot-password / reset-password.

## Endpoints (base `/{API_PREFIX}`)

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` |
| POST | `/auth/refresh` | Public | `{ refreshToken }` |
| POST | `/auth/logout` | Bearer | `{ refreshToken?, allDevices? }` |
| POST | `/auth/forgot-password` | Public | `{ email }` |
| POST | `/auth/reset-password` | Public | `{ token, newPassword }` |
| POST | `/auth/change-password` | Bearer | `{ currentPassword, newPassword }` |
| GET  | `/auth/me` | Bearer | — |
| GET  | `/rbac/me/permissions` | Bearer | — |
| GET  | `/rbac/roles` | Bearer + `rbac:read` | — |

## Security notes

- Access tokens are short-lived JWTs (`JWT_ACCESS_TTL_SECONDS`, default 15
  min) signed HS256 with `JWT_ACCESS_SECRET`.
- Refresh tokens are 32-byte opaque randoms — stored as SHA-256 hashes,
  rotated on every refresh, revocable per-token or per-user.
- Password reset tokens are single-use, hashed at rest, TTL configurable.
- Password hashing uses argon2id (`m=65536, t=3, p=4`).
- Login intentionally does *not* enumerate: unknown-user and
  bad-password paths return the same shape and perform equal-CPU work.
- Failed logins increment a counter; N failures within the window lock
  the account for `LOGIN_LOCKOUT_MINUTES`.
- On password change / reset, all refresh tokens for the user are
  revoked (equivalent to "sign out everywhere").
