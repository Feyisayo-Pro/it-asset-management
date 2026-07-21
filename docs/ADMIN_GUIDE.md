# Administrator Guide

Operational guide for Super Admins and platform operators of the IT Asset
Lifecycle Management platform.

## 1. Initial setup

1. Provision PostgreSQL 15+ and populate `packages/backend/.env` (see
   [`ENVIRONMENT.md`](ENVIRONMENT.md) for every variable, and
   [`DEPLOYMENT.md`](DEPLOYMENT.md) for containerized deployment).
2. Run database migrations — this creates the full schema **and** seeds
   the five fixed roles plus the entire permission catalogue:

   ```bash
   cd packages/backend
   npm run migration:run
   ```

3. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in `.env`
   (see next section) and start the backend once — this creates your
   first Super Admin.
4. Log in as that Super Admin, change the temporary password
   (enforced — `mustChangePassword` is set on the bootstrap account), and
   begin creating real user accounts under **User Management**.
5. Confirm the deployment is healthy: `GET /api/v1/health` should report
   `"status": "ok"` with `checks.database: "ok"`.
6. Consider clearing/rotating `BOOTSTRAP_ADMIN_PASSWORD` after the first
   real admin accounts exist (the bootstrap routine is a no-op once any
   user row exists, so leaving it set is harmless, but rotating avoids the
   credential lingering in your secret store indefinitely).

## 2. Bootstrap admin account

Handled by `BootstrapAdminService` (`src/modules/auth/infrastructure/services/bootstrap-admin.service.ts`),
which runs once on every application boot (`OnApplicationBootstrap`):

- **Trigger:** both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`
  are set, **and** the `users` table is currently empty.
- **Effect:** creates one user with `firstName: "System"`,
  `lastName: "Administrator"`, the given email, the given password
  (hashed with argon2id), role `SUPER_ADMIN`, and
  `mustChangePassword: true`.
- **Idempotency:** if the `users` table already has any row (from a prior
  boot, a restore, or manual seeding), this is a complete no-op — safe to
  leave the env vars set permanently.
- **Failure mode:** if the `SUPER_ADMIN` role is somehow missing (e.g.
  migrations weren't fully applied), bootstrap logs a warning and skips —
  it does not create a misconfigured user.

**If you lose access to every Super Admin account** and need to
re-bootstrap: either (a) manually `DELETE` the affected row(s) from the
`users` table so bootstrap can run again on next boot with new
credentials, or (b) directly insert/update a user row via `psql` — set
`role_id` to the seeded `SUPER_ADMIN` role id
(`11111111-0000-0000-0000-000000000001`) and set `password_hash` to an
argon2id hash you generate out-of-band. Treat this as a break-glass
procedure, not routine operation.

## 3. RBAC configuration

The platform uses a **fixed** (not user-editable at runtime) catalogue of
5 roles, seeded by migrations. Roles cannot be created, renamed, or
deleted through the API — `GET /api/v1/rbac/roles` only lists them, it
does not mutate them. Permission grants are likewise fixed at the database
level (`role_permissions` join table), populated exclusively by
migrations.

### The 5 roles

| Role | Seed description |
|---|---|
| `SUPER_ADMIN` | Full system access |
| `STORES_OFFICER` | Manages inventory and asset registration |
| `IT_REP` | Performs assessments and repair handling |
| `PEOPLE_CULTURE` | Owns allocation and return workflows |
| `EMPLOYEE` | Requests devices and signs allocations |

### Full permission matrix

`✓` = granted. Derived from every migration under
`packages/backend/src/migrations/` that inserts into `role_permissions`
(cumulative — later migrations only *add* grants, none remove any).

| Permission | Super Admin | Stores Officer | IT Rep | People & Culture | Employee |
|---|:---:|:---:|:---:|:---:|:---:|
| `auth:manage-own-password` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `user:manage` | ✓ | | | | |
| `employee:read` | ✓ | ✓ | ✓ | ✓ | |
| `employee:manage` | ✓ | | | ✓ | |
| `employee:manage-status` | ✓ | | | ✓ | |
| `asset:read` | ✓ | ✓ | ✓ | ✓ | |
| `asset:read-own` | ✓ | | | | ✓ |
| `asset:manage` | ✓ | ✓ | | | |
| `asset:direct-status` | ✓ | | | | |
| `rbac:read` | ✓ | | | | |
| `audit:read` | ✓ | | | | |
| `workflow:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `workflow:configure` | ✓ | | | | |
| `workflow:transition` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `workflow:bypass` | ✓ | | | | |
| `assessment:read` | ✓ | ✓ | ✓ | ✓ | |
| `assessment:manage` | ✓ | | ✓ | | |
| `repair:read` | ✓ | ✓ | ✓ | ✓ | |
| `repair:manage` | ✓ | | ✓ | | |
| `disposal:read` | ✓ | ✓ | ✓ | ✓ | |
| `disposal:request` | ✓ | ✓ | | | |
| `disposal:approve` | ✓ | | | | |
| `notification:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `notification:manage` | ✓ | | | | |
| `report:read` | ✓ | ✓ | ✓ | ✓ | |
| `report:export` | ✓ | ✓ | ✓ | ✓ | |
| `dashboard:read` | ✓ | ✓ | ✓ | ✓ | ✓ |

Notable implications:

- **Employees** effectively only have: change their own password, read
  their own assigned assets, view/act on workflow instances they're a
  party to (e.g. signing their own return), read notifications, and view
  the dashboard. They cannot see reports, assessments, repairs, or
  disposals at all.
- **`asset:direct-status`, `workflow:configure`, `workflow:bypass`,
  `rbac:read`, `audit:read`, `user:manage`, `notification:manage`, and
  `disposal:approve`** are exclusively Super Admin. In particular,
  disposal approval/rejection is a Super-Admin-only action today, even
  though Stores Officers can *request* disposals.
- Enforcement is server-side and layered: `@Roles()` restricts by role
  name, `@RequirePermissions()` restricts by resolved permission set — see
  [`API.md`](API.md#authorization-model) for exactly which decorator
  applies to each endpoint.

### Changing RBAC (requires a migration)

Because grants live in the database and are only ever inserted by
migrations (no admin UI or API mutates `role_permissions`), changing who
can do what requires writing a new TypeORM migration that inserts (or, if
you truly need to revoke, deletes) rows in `role_permissions`, following
the pattern established in the existing migrations (e.g.
`1720900000000-AddDashboardPermission.ts` is the simplest example). Apply
it the same way as any other schema change (see
[`DEPLOYMENT.md`](DEPLOYMENT.md#8-database-migrations)).

## 4. User lifecycle management

All operations below are under **Admin → User Management**
(`/api/v1/admin/users/*`, Super-Admin-only — see [`API.md`](API.md#2-users-admin)).

- **Create:** first/last name, email (unique), role, initial password
  (≥12 chars), and whether the user must change their password on first
  login (recommended: always yes for admin-created accounts).
- **Edit:** update first/last name or email.
- **Reassign role:** move a user between the 5 fixed roles. Two
  safeguards are enforced server-side:
  - You cannot change your **own** role (`CANNOT_CHANGE_OWN_ROLE`).
  - You cannot demote the **last** remaining Super Admin
    (`CANNOT_DEMOTE_LAST_ADMIN`) — always keep at least two Super Admins
    in any real deployment so this never blocks you in an emergency.
- **Deactivate:** disables login for that user. Blocked for the last
  remaining Super Admin (`CANNOT_DEACTIVATE_LAST_ADMIN`) and for
  deactivating yourself (`CANNOT_DEACTIVATE_SELF`).
- **Reactivate:** re-enables a deactivated account.
- **Password resets for other users:** Super Admins do not directly reset
  another user's password from the admin panel — direct the user to
  **Forgot password** on the login screen (email-based reset,
  `PASSWORD_RESET_TTL_MINUTES` validity), or deactivate/reactivate isn't a
  substitute for this; if email delivery isn't configured in your
  environment, create a replacement temporary password via the Edit flow's
  underlying create/rotate tooling appropriate to your deployment.
- **Account lockout recovery:** repeated failed logins lock an account for
  `LOGIN_LOCKOUT_MINUTES` (default 15). This clears automatically after
  the window — there is no manual "unlock" action; if urgent, wait it out
  or adjust `LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES` and restart the
  backend (affects all users going forward, not retroactively).

## 5. System monitoring

Two unauthenticated endpoints exist purpose-built for monitoring
(`src/common/controllers/health.controller.ts`):

| Endpoint | Use for | Behavior |
|---|---|---|
| `GET /api/v1/health` | Readiness / synthetic monitoring | Runs `SELECT 1` against PostgreSQL. Always returns HTTP 200; check the JSON `status` (`"ok"`/`"degraded"`) and `checks.database` field. |
| `GET /api/v1/health/live` | Liveness / container restart policy | Returns `{"status":"ok"}` without touching the database. |

Recommended monitoring setup:

- Point your load balancer's health check at `GET /api/v1/health` so
  traffic drains from instances that lose DB connectivity.
- Point your container orchestrator's liveness probe at
  `GET /api/v1/health/live` so a hung process gets restarted even if the
  database itself is the thing that's down (which `/health` alone would
  otherwise mask as "the app is unhealthy" rather than "the DB is
  unhealthy").
- Add an external synthetic check (uptime monitor) hitting `/health` on a
  schedule independent of your load balancer, so DB connectivity problems
  are caught even if the LB config itself is wrong.
- Ship application logs (stdout/stderr) to a log aggregator. Every request
  and error is tagged with a `correlationId` by the global logging
  interceptor / exception filter — use it to trace a user-reported issue
  end-to-end, and cross-reference it against the same field recorded on
  audit log entries for that request.
- Watch for repeated `429` responses in logs/metrics — that's the
  `ThrottlerGuard` engaging (`THROTTLE_LIMIT_GLOBAL`/`THROTTLE_LIMIT_AUTH`),
  which may indicate either abuse or limits set too low for real traffic.

## 6. Backup/restore procedures

The platform's state lives entirely in PostgreSQL — the backend process
itself is stateless. Standard PostgreSQL backup/restore practice applies.

### Backup

```bash
# Full logical backup (custom format, compressed, restorable selectively)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -Fc -f iam-backup-$(date +%F).dump $DB_NAME
```

Automate this on a schedule (cron, a managed provider's automated backup
feature, or a Kubernetes CronJob) and store the artifact somewhere
durable and access-controlled (object storage with encryption at rest,
separate from the database host). Retain enough history to meet your
compliance requirements — audit log data in particular tends to have
retention requirements independent of operational data.

If you run PostgreSQL via the Docker Compose reference in
[`DEPLOYMENT.md`](DEPLOYMENT.md#6-docker-compose-single-host-reference),
back up the `db-data` named volume as well (or rely exclusively on
`pg_dump`, which is portable across PostgreSQL versions/hosts and doesn't
require restoring the exact same container setup).

### Restore

```bash
# Against a fresh, empty target database:
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists iam-backup-2026-07-16.dump
```

After restoring:

1. Run `npm run migration:run` from `packages/backend` — this is a safe
   no-op if the restored dump already includes every migration that has
   run, but is required if you're restoring onto a database that's behind
   on schema (e.g. restoring a backup taken before a later release shipped
   new migrations).
2. Start the backend and confirm `GET /api/v1/health` reports `"ok"`.
3. Spot-check that `roles`/`permissions`/`role_permissions` are intact —
   these tables are small and rarely change, so a mismatch usually means
   the restore didn't fully apply or migrations are out of sync.

### Point-in-time recovery (PITR)

For production deployments with a low tolerance for data loss, enable
WAL archiving / continuous backup on your PostgreSQL instance (native
support in most managed providers — RDS, Cloud SQL, etc.; `pgBackRest` or
`WAL-G` for self-managed) rather than relying solely on periodic
`pg_dump` snapshots.

### Testing your backups

A backup you haven't restored is not a backup. Periodically restore a
recent dump into a scratch database and verify the application boots
against it and `/api/v1/health` passes.

## 7. Security configuration

Security-relevant behavior already built into the backend, and what you
should configure around it:

| Area | Implementation | Operator action |
|---|---|---|
| Transport security | HTTP only at the app layer | Always terminate TLS in front (Nginx/load balancer) — see [`DEPLOYMENT.md`](DEPLOYMENT.md#5-nginx-reverse-proxy-configuration). |
| HTTP security headers | `helmet()` applied globally (`src/main.ts`) | No action needed; review `helmet`'s defaults if you have specific CSP requirements. |
| CORS | `enableCors({ origin: CORS_ORIGIN, credentials: true })` | Set `CORS_ORIGIN` to your exact frontend origin — never wildcard in production. |
| AuthN | JWT access tokens (HS256, `JWT_ACCESS_SECRET`) + opaque, hashed-at-rest refresh tokens | Use strong, unique, ≥32-char secrets; rotate them if ever suspected leaked (invalidates all sessions). |
| AuthZ | Global `JwtAuthGuard` + `RbacGuard`, `@Roles()`/`@RequirePermissions()` | Review the [permission matrix](#full-permission-matrix) before granting a role to a new hire. |
| Password hashing | argon2id (`m=65536, t=3, p=4`) | No action needed. |
| Account lockout | `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | Tune for your risk tolerance vs. user friction. |
| Login enumeration resistance | Bad-password and unknown-user paths return identical responses/timing | No action needed. |
| Rate limiting | Global + tighter `auth`-bucket throttling (`THROTTLE_*`) | Tune limits to real traffic; consider an additional WAF/CDN layer. |
| Input validation | Global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` | No action needed — unknown fields are rejected outright. |
| Audit trail | Every significant mutation is recorded (`audit_logs`), Super-Admin-readable only | Review periodically; export for compliance as needed. |
| Secrets management | Read from environment only, never hardcoded | Use a secret manager in production, never commit `.env` to version control. |

Additional recommendations:

- Rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` on a schedule consistent
  with your security policy; rotating immediately invalidates all
  outstanding access/refresh tokens (all users must log in again).
- Enforce least privilege in practice: most staff should be
  `STORES_OFFICER`, `IT_REP`, or `PEOPLE_CULTURE`, not `SUPER_ADMIN` — keep
  the Super Admin count to the minimum needed for safe operation (at least
  two, so the "last admin" safeguards never trap you).
- Review the audit log periodically for unexpected `user:manage` actions,
  disposal approvals, or direct asset status overrides — these are the
  highest-impact, least-frequently-used actions in the system.

## 8. Troubleshooting common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend refuses to start, logs a Joi validation error | A required env var is missing/invalid — most commonly `JWT_ACCESS_SECRET` missing or under 32 chars | Check `packages/backend/.env` against [`ENVIRONMENT.md`](ENVIRONMENT.md); the Joi schema fails fast (`abortEarly: true`) on the first bad value. |
| `GET /api/v1/health` returns `"status": "degraded"` | Database unreachable (wrong `DB_HOST`/`DB_PORT`/credentials, network/firewall issue, DB down) | Check DB connectivity from the backend host/container; verify `DB_*` env vars; check PostgreSQL is running and accepting connections. |
| No way to log in on a fresh install | Migrations weren't run before first boot, or `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` were unset | Run `npm run migration:run`, set both bootstrap env vars, restart the backend once (bootstrap only fires when `users` is empty). |
| `403 Forbidden` on an action a user "should" be able to do | Their role doesn't hold the required permission — check the [permission matrix](#full-permission-matrix) | Reassign their role if appropriate, or confirm the action genuinely requires a higher-privileged role (e.g. disposal approval is Super-Admin-only by design). |
| `401 Unauthorized` shortly after a successful login | Access token expired (`JWT_ACCESS_TTL_SECONDS`, default 15 min) and the client didn't refresh | Confirm the frontend is calling `POST /api/v1/auth/refresh` before/on expiry; check clock skew between client and server if this happens unexpectedly early. |
| User account locked out | `LOGIN_MAX_ATTEMPTS` consecutive failures | Wait `LOGIN_LOCKOUT_MINUTES`; it clears automatically. No manual unlock exists. |
| `429 Too Many Requests` | Global or auth-bucket rate limit hit (`THROTTLE_*`) | Confirm it's not a genuine abuse pattern; otherwise raise the relevant `THROTTLE_LIMIT_*` env var and restart. |
| CORS error in the browser console | `CORS_ORIGIN` doesn't match the frontend's actual origin, or the frontend is calling the backend cross-origin instead of through the same-origin Nginx proxy | Set `CORS_ORIGIN` to the exact scheme+host+port of the frontend; prefer the same-origin Nginx setup in [`DEPLOYMENT.md`](DEPLOYMENT.md) to avoid CORS altogether. |
| `409 Conflict` creating/updating an asset | Duplicate `assetTag`, `serialNumber`, or `imei` | Check for an existing asset with that identifier before retrying. |
| `409 Conflict` (`INVALID_ASSET_STATUS_TRANSITION`) | Attempted status change isn't legal from the asset's current status | Review the [asset lifecycle diagram](USER_MANUAL.md#asset-management) — e.g. `Disposed` is terminal outside a Super Admin override. |
| A return/repair/disposal action returns `403` even though the user's role looks right in the [`API.md`](API.md) table | For Returns specifically, some actions (e.g. `sign`) are gated by the **workflow definition's** required roles, not just the controller's `@Roles()` — the wrong stage or wrong role-for-that-stage will still 403 | Check the return's current workflow state and `availableActions` (`GET /api/v1/returns/:id`) to see what's actually actionable right now, by whom. |
| Migration fails partway through | Manual DB edits drifted the schema from what TypeORM expects, or a migration was run out of order | Inspect the `migrations` table to see what's recorded as applied; restore from backup if the schema is in an inconsistent state rather than hand-patching. |
| Need to recover from losing all Super Admin access | See [Bootstrap admin account](#2-bootstrap-admin-account) break-glass procedure | Clear the `users` table (if acceptable) to re-trigger bootstrap, or hand-insert a `SUPER_ADMIN` user row via `psql`. |
