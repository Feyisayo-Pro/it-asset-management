# User Management

Implementation notes for the User Management feature (backend admin
surface of AuthModule + frontend admin pages). Cross-references:

- Backend layout: [`14-backend-implementation-plan.md`](14-backend-implementation-plan.md) §1 (AuthModule).
- Frontend layout: [`15-frontend-implementation-plan.md`](15-frontend-implementation-plan.md) §3.8, §4 (UserManagementPage / UserCreatePage / UserEditPage).
- UI spec: [`12-ui-design.md`](12-ui-design.md) §29 (list), §30 (form).
- Domain events: this doc §5.

## 1. Business rules

These are enforced in the domain / application layer regardless of who
calls the API — the frontend duplicates the friendliest ones for UX
but is never authoritative.

| Rule | Enforced by | Error code |
|---|---|---|
| Password meets policy (≥ 12, mixed case, digit, symbol, no whitespace) | `PasswordPolicy` | `AUTH_WEAK_PASSWORD` |
| Email unique (case-insensitive) | `CreateUserUseCase`, `UpdateUserUseCase` | `DUPLICATE_EMAIL` |
| `roleId` refers to a real role | `CreateUserUseCase`, `ChangeUserRoleUseCase` | `ROLE_NOT_FOUND` |
| Cannot demote the last active Super Admin | `ChangeUserRoleUseCase` | `CANNOT_DEMOTE_LAST_ADMIN` |
| Cannot deactivate the last active Super Admin | `DeactivateUserUseCase` | `CANNOT_DEACTIVATE_LAST_ADMIN` |
| Cannot change own role | `ChangeUserRoleUseCase` | `CANNOT_CHANGE_OWN_ROLE` |
| Cannot deactivate own account | `DeactivateUserUseCase` | `CANNOT_DEACTIVATE_SELF` |
| Role change or deactivation revokes all refresh tokens for the user | `ChangeUserRoleUseCase`, `DeactivateUserUseCase` | — |
| Activate/deactivate are idempotent (no-op + no event on same-state) | `ActivateUserUseCase`, `DeactivateUserUseCase` | — |

Every mutating endpoint is authenticated, role-restricted to
`SUPER_ADMIN`, and permission-gated on `user:manage`.

## 2. Database

Two schema changes over the initial auth migration:

- `users.first_name VARCHAR(100) NOT NULL`
- `users.last_name VARCHAR(100) NOT NULL`
- `ix_users_last_name` index (for the default sort in the list view)

Migration: `1720100000000-AddUserProfileFields.ts`. Backfills any
pre-existing row with a `System / Administrator` placeholder before the
NOT NULL promotion, so the migration is safe on a bootstrap-admin
seeded DB.

## 3. HTTP API

All routes are prefixed with `${API_PREFIX}` (default `/api/v1`).
Requests need `Authorization: Bearer <access_token>` and the caller's
role must be `SUPER_ADMIN`.

### 3.1 `GET /admin/users`

**Query params**

| Name | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `pageSize` | int 1–200 | 20 | |
| `search` | string | — | Substring match on email or first/last name |
| `roleId` | uuid | — | Filter by role |
| `isActive` | `true` / `false` | — | Omit for "all" |
| `sortField` | `lastName` / `email` / `lastLoginAt` / `createdAt` | `lastName` | |
| `sortDirection` | `asc` / `desc` | `asc` | |

**Response** — `200 OK`

```json
{
  "data": [
    {
      "id": "…", "email": "…",
      "firstName": "Ada", "lastName": "Lovelace",
      "roleId": "…", "isActive": true,
      "lastLoginAt": "2026-07-10T…" | null,
      "mustChangePassword": false,
      "createdAt": "…", "updatedAt": "…"
    }
  ],
  "page": 1, "pageSize": 20, "total": 1
}
```

### 3.2 `GET /admin/users/:id`

`200 OK` → `AdminUserDto`. `404 USER_NOT_FOUND` on missing id.

### 3.3 `POST /admin/users`

**Body**

```json
{
  "firstName": "Ada", "lastName": "Lovelace",
  "email": "ada@example.com",
  "roleId": "…",
  "password": "Str0ng-Pass!word",
  "mustChangePassword": false
}
```

**Response** — `201 Created` → `AdminUserDto`.
Errors: `409 DUPLICATE_EMAIL`, `404 ROLE_NOT_FOUND`, `400 AUTH_WEAK_PASSWORD`.

### 3.4 `PATCH /admin/users/:id`

Partial update. Body accepts any subset of `firstName`, `lastName`,
`email`. Response `200 OK` → `AdminUserDto`.
Errors: `404 USER_NOT_FOUND`, `409 DUPLICATE_EMAIL`.

### 3.5 `PATCH /admin/users/:id/role`

**Body**: `{ "roleId": "…" }`. Response `200 OK` → `AdminUserDto`.
Side-effects: revokes every active refresh token for the target user,
invalidates RBAC cache for both source and target roles.
Errors: `403 CANNOT_CHANGE_OWN_ROLE`, `409 CANNOT_DEMOTE_LAST_ADMIN`,
`404 USER_NOT_FOUND`, `404 ROLE_NOT_FOUND`.

### 3.6 `POST /admin/users/:id/deactivate`

Response `200 OK` → `AdminUserDto`. Idempotent (already-inactive user
returned unchanged, no event). Side-effect: revokes every active
refresh token for the target user.
Errors: `403 CANNOT_DEACTIVATE_SELF`, `409 CANNOT_DEACTIVATE_LAST_ADMIN`,
`404 USER_NOT_FOUND`.

### 3.7 `POST /admin/users/:id/activate`

Response `200 OK` → `AdminUserDto`. Idempotent. Clears failed-login
counter and any lockout. `404 USER_NOT_FOUND` on missing user.

## 4. Validation

Validation runs at three levels, and each must agree:

| Level | Where | What it enforces |
|---|---|---|
| **HTTP DTO** | `class-validator` on `AdminCreateUserDto`, `AdminUpdateUserDto`, `AdminChangeRoleDto`, `ListUsersQuery` | Shape, presence, length, format (email, UUID); email normalized to lowercase/trimmed |
| **Domain** | `PasswordPolicy` and `User.updateProfile / changeRole` invariants | Password complexity, name trimming, email lowercase |
| **Application** | Use cases | Uniqueness, role existence, last-admin safeguards, self-safeguards |

Frontend Zod schemas (`createUserSchema`, `editUserSchema`) mirror
the server rules so the user gets immediate feedback. Server always
wins — any mismatch surfaces via the standard API error envelope,
mapped by `UserCreatePage` / `UserEditPage` onto inline field errors
(`DUPLICATE_EMAIL`, `AUTH_WEAK_PASSWORD`) or toasts.

## 5. Domain events

Published via the `EventPublisher`. Subscribers can be wired
independently; today `AuditModule` will consume all of them (M2+).

| Event | Emitted by | Payload |
|---|---|---|
| `auth.admin.user.created` | `CreateUserUseCase` | `{ userId, email, roleId, createdByUserId }` |
| `auth.admin.user.updated` | `UpdateUserUseCase` | `{ userId, updatedByUserId, changedFields[] }` |
| `auth.admin.user.role-changed` | `ChangeUserRoleUseCase` | `{ userId, fromRoleId, toRoleId, changedByUserId }` |
| `auth.admin.user.activated` | `ActivateUserUseCase` | `{ userId, activatedByUserId }` |
| `auth.admin.user.deactivated` | `DeactivateUserUseCase` | `{ userId, deactivatedByUserId }` |

## 6. Tests

Backend — Jest unit tests (**27 new**, all passing):

- `create-user.use-case.spec.ts` — happy path, weak password, duplicate email, unknown role
- `update-user.use-case.spec.ts` — happy path with `changedFields`, no-op, clash with another user, user not found
- `change-user-role.use-case.spec.ts` — happy path + refresh-token revocation, self-role-change denial, last-admin protection (only counts *active* admins), allowed demotion when another admin exists, missing user, unknown role
- `deactivate-user.use-case.spec.ts` — happy path + refresh revocation, self-deactivate denial, last-admin protection, idempotency, missing user
- `activate-user.use-case.spec.ts` — happy path, idempotency, missing user
- `list-users.use-case.spec.ts` — pagination + total, role/status filter, substring search
- `get-user.use-case.spec.ts` — happy + missing

All use in-memory fakes for repositories, hasher, tokens, clock, mail,
events, and RBAC — no DB required.

Frontend — Vitest (**11 tests, all passing**) on the shared zod
schemas covering: valid create payload, every password-policy
rejection reason (short/no-upper/no-lower/no-digit/no-symbol/whitespace),
password mismatch → error on `confirmPassword`, invalid `roleId`,
valid + invalid edit payload.

## 7. Frontend components landed

Under `packages/frontend/src/features/admin/users/`:

| File | Responsibility |
|---|---|
| `pages/UserManagementPage.tsx` | Table with search + role filter + active/inactive filter + pagination; row-kebab for Edit / Change Role / Deactivate·Activate; self-actions disabled. |
| `pages/UserCreatePage.tsx` | Wraps `UserForm` in create mode; maps `DUPLICATE_EMAIL` / `AUTH_WEAK_PASSWORD` to inline errors. |
| `pages/UserEditPage.tsx` | Loads user via `useUser`, wraps `UserForm` in edit mode. |
| `components/UserForm.tsx` | React-Hook-Form + zod. Reused for create/edit; hides password fields on edit; accepts server-field-error prop for inline mapping. |
| `components/ChangeRoleModal.tsx` | RolePicker + warning banner when demoting Super Admin. |
| `components/RolePicker.tsx` | Select fed by `useRoles`. |
| `hooks/useUsers.ts` / `useUser.ts` | TanStack Query list + detail. |
| `hooks/useUserMutations.ts` | Create / Update / ChangeRole / Deactivate / Activate mutations with automatic cache invalidation. |
| `hooks/useRoles.ts` | Role catalogue, cached for 15 min. |
| `schemas/user.schema.ts` | Zod schemas (`createUserSchema`, `editUserSchema`). |

Cross-cutting FE plumbing added alongside:

- `stores/auth.store.ts` — persisted Zustand store (access + refresh + user + permissions).
- `api/client.ts` — Axios instance with attach-auth + coalesced refresh-on-401 + normalized `ApiError`.
- `api/error.ts`, `api/query-keys.ts`, `api/auth.api.ts`, `api/rbac.api.ts`, `api/users.api.ts`.
- `hooks/useAuth.ts`, `hooks/usePermission.ts`.
- `layouts/AppLayout.tsx`, `layouts/AuthLayout.tsx`.
- `routes/router.tsx`, `routes/ProtectedRoute.tsx` — role-scoped route guard.
- `components/PageHeader.tsx`, `RoleBadge.tsx`, `StatusDot.tsx`.
- `features/auth/pages/LoginPage.tsx` + `hooks/useLogin.ts`.
- `pages/PermissionDeniedPage.tsx`, `NotFoundPage.tsx`.
- Vite + Ant Design 5 + React Router 6 + TanStack Query 5 wired in `App.tsx` / `main.tsx`.

## 8. How to run

Backend:

```bash
cd packages/backend
cp .env.example .env
# set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD so the SA
# account is created on first boot; then:
npm run migration:run
npm run start:dev
```

Frontend (in a second terminal):

```bash
cd packages/frontend
npm run dev
# open http://localhost:5173 → redirects to /login
# sign in with the bootstrap admin → lands on /admin/users
```

Vite's dev server proxies `/api/*` to `http://localhost:3000` (see
`vite.config.ts`) so no CORS setup is needed in development.
