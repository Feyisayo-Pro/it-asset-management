# API Documentation

REST API reference for the IT Asset Lifecycle Management & Workflow Platform
backend (NestJS 10 + TypeORM 0.3 + PostgreSQL). Generated from the controller
sources under `packages/backend/src/modules/*/presentation/*.controller.ts`
and `packages/backend/src/common/controllers/health.controller.ts`.

## Conventions

### Base URL

All routes are served under a global prefix:

```
http://<host>:<port>/{API_PREFIX}
```

`API_PREFIX` defaults to `api/v1` (see [`ENVIRONMENT.md`](ENVIRONMENT.md)).
Every path in this document is written in full, e.g. `/api/v1/auth/login`.

### Authentication

The API is JWT bearer-token based. `JwtAuthGuard` and `RbacGuard` are
registered as **global guards** (`src/app.module.ts`) — every route requires
a valid access token *unless* the handler is decorated with `@Public()`.
Public routes are called out explicitly below (auth issuance endpoints and
the two health endpoints).

Send the access token on every protected request:

```
Authorization: Bearer <accessToken>
```

Access tokens are short-lived (`JWT_ACCESS_TTL_SECONDS`, default 900s / 15
min). Use `POST /auth/refresh` with the opaque `refreshToken` to mint a new
pair before/after expiry.

### Authorization model

Two independent, both-must-pass checks are layered on top of authentication:

- **`@Roles(...)`** — the caller's `roleName` must be one of the listed
  roles (`SUPER_ADMIN`, `STORES_OFFICER`, `IT_REP`, `PEOPLE_CULTURE`,
  `EMPLOYEE`). If a controller/handler has no `@Roles()`, any authenticated
  role may call it.
- **`@RequirePermissions(...)`** — the caller's resolved permission set
  (role → permission, see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) for the full
  matrix) must contain **all** listed permission keys. If a handler has no
  `@RequirePermissions()`, no permission check is applied beyond `@Roles()`.

Both checks fail closed with `403 Forbidden` (`Role not permitted` /
`Insufficient permissions`). Missing/invalid tokens fail with
`401 Unauthorized`.

Tables below show the **effective** requirement per endpoint (class-level
decorators combined with method-level overrides), and, where useful, which
of the 5 roles satisfy the permission today given the seeded RBAC matrix.

### Request validation

All bodies/queries are validated with `class-validator` via a global
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform:
true })`. Unknown fields are rejected (`400 Bad Request`); type coercion
(e.g. numeric query params) is applied automatically.

### Pagination envelope

All list endpoints return the same shape:

```json
{
  "data": [ /* array of resource DTOs */ ],
  "page": 1,
  "pageSize": 20,
  "total": 137
}
```

`page` and `pageSize` are accepted as query params (1-based; `pageSize` is
capped per-endpoint, typically 200, assets up to 500).

### Error envelope

Errors are normalized by the global exception filter to:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | DOMAIN_ERROR_CODE | INTERNAL_SERVER_ERROR",
    "message": "Human readable message",
    "correlationId": "uuid-or-undefined",
    "details": { "...": "optional extra context" }
  }
}
```

Common domain error codes and their HTTP status (non-exhaustive; see
`src/common/filters/global-exception.filter.ts`):

| Code | Status | Meaning |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Bad email/password (no user enumeration) |
| `AUTH_ACCOUNT_LOCKED` | 401 | Too many failed logins; locked until timeout |
| `AUTH_ACCOUNT_DISABLED` | 401 | User deactivated |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `CANNOT_DEMOTE_LAST_ADMIN` / `CANNOT_DEACTIVATE_LAST_ADMIN` | 409 | Last Super Admin safeguard |
| `ASSET_NOT_FOUND` | 404 | Unknown asset id/tag |
| `DUPLICATE_ASSET_TAG` / `DUPLICATE_SERIAL_NUMBER` / `DUPLICATE_IMEI` | 409 | Uniqueness violation |
| `INVALID_ASSET_STATUS_TRANSITION` | 409 | Illegal lifecycle transition |
| `WORKFLOW_INSTANCE_NOT_FOUND` / `INVALID_TRANSITION` | 404 / 409 | Workflow engine errors |
| `RETURN_NOT_FOUND` / `ACTIVE_RETURN_EXISTS` | 404 / 409 | Return workflow errors |
| `REPAIR_NOT_FOUND` / `ACTIVE_REPAIR_EXISTS` | 404 / 409 | Repair errors |
| `DISPOSAL_NOT_FOUND` / `ACTIVE_DISPOSAL_EXISTS` | 404 / 409 | Disposal errors |
| `NOTIFICATION_ACCESS_DENIED` | 403 | Notification not owned by caller |

### Rate limiting

Global throttling applies to every route (`THROTTLE_LIMIT_GLOBAL` requests
per `THROTTLE_TTL_SECONDS`, default **120 req / 60s** per IP). Login,
forgot-password, and reset-password additionally carry a tighter
`@ThrottleAuth()` bucket (`THROTTLE_LIMIT_AUTH`, default **10 req / 60s**).
Throttled requests return `429 Too Many Requests`.

---

## Module Index

| Module | Base Path | Controller |
|---|---|---|
| [Auth](#1-auth) | `/api/v1/auth` | `auth.controller.ts` |
| [Users (Admin)](#2-users-admin) | `/api/v1/admin/users` | `admin-user.controller.ts` |
| [Assets](#3-assets) | `/api/v1/assets` | `asset.controller.ts` |
| [Returns](#4-returns) | `/api/v1/returns` | `return.controller.ts` |
| [Assessments](#5-assessments) | `/api/v1/assessments` | `assessment.controller.ts` |
| [Repairs](#6-repairs) | `/api/v1/repairs` | `repair.controller.ts` |
| [Disposals](#7-disposals) | `/api/v1/disposals` | `disposal.controller.ts` |
| [Notifications](#8-notifications) | `/api/v1/notifications` | `notification.controller.ts` |
| [Reports](#9-reports) | `/api/v1/reports` | `reporting.controller.ts` |
| [Dashboard](#10-dashboard) | `/api/v1/dashboard` | `enterprise-dashboard.controller.ts` |
| [Audit Logs](#11-audit-logs) | `/api/v1/audit-logs` | `audit.controller.ts` |
| [Health](#12-health) | `/api/v1/health` | `health.controller.ts` |
| [Workflow Engine](#13-workflow-engine-internalconfiguration-api) | `/api/v1/workflows` | `workflow.controller.ts` |
| [RBAC](#14-rbac) | `/api/v1/rbac` | `rbac.controller.ts` |

---

## 1. Auth

Controller: `auth.controller.ts` — `@Controller('auth')`. No class-level
guard beyond the global ones; individual handlers are marked `@Public()`
where noted.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public (throttled) | Issue an access + refresh token pair |
| POST | `/api/v1/auth/refresh` | Public | Rotate a refresh token for a new pair |
| POST | `/api/v1/auth/logout` | Bearer | Revoke a refresh token (or all of the user's tokens) |
| POST | `/api/v1/auth/forgot-password` | Public (throttled) | Request a password-reset email |
| POST | `/api/v1/auth/reset-password` | Public (throttled) | Consume a reset token, set a new password |
| POST | `/api/v1/auth/change-password` | Bearer | Change your own password |
| GET | `/api/v1/auth/me` | Bearer | Return the authenticated principal |

### POST /api/v1/auth/login

Public. `200 OK`.

Request body (`LoginDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Trimmed + lowercased, valid email, max 255 |
| `password` | string | yes | 1–128 chars |

Response body:

```json
{
  "accessToken": "eyJ...",
  "accessTokenExpiresIn": 900,
  "refreshToken": "base64url-opaque-token",
  "refreshTokenExpiresIn": 1209600,
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "roleName": "IT_REP",
    "mustChangePassword": false
  }
}
```

Failed logins increment a per-user counter; `LOGIN_MAX_ATTEMPTS` failures
within the window lock the account for `LOGIN_LOCKOUT_MINUTES`. Unknown-user
and bad-password paths return the identical error shape (no enumeration).

### POST /api/v1/auth/refresh

Public. `200 OK`.

Request body (`RefreshDto`): `{ "refreshToken": "string (16-256 chars)" }`

Response body (`RefreshResponseDto`):

```json
{
  "accessToken": "eyJ...",
  "accessTokenExpiresIn": 900,
  "refreshToken": "new-opaque-token",
  "refreshTokenExpiresIn": 1209600
}
```

The presented refresh token is rotated (old one invalidated) on every call.

### POST /api/v1/auth/logout

Bearer required. `204 No Content`.

Request body (`LogoutDto`, all optional):

| Field | Type | Notes |
|---|---|---|
| `refreshToken` | string | 16–256 chars; revoke this specific token |
| `allDevices` | boolean | Revoke every refresh token for the caller |

### POST /api/v1/auth/forgot-password

Public (throttled). `202 Accepted`.

Request body (`ForgotPasswordDto`): `{ "email": "string" }`

Response: `{ "status": "accepted" }` — always returned regardless of whether
the email matches an account (no enumeration). A reset email is sent only
if the account exists; the token TTL is `PASSWORD_RESET_TTL_MINUTES`.

### POST /api/v1/auth/reset-password

Public (throttled). `204 No Content`.

Request body (`ResetPasswordDto`):

| Field | Type | Notes |
|---|---|---|
| `token` | string | 32–256 chars, from the reset email link |
| `newPassword` | string | 12–128 chars |

All of the user's refresh tokens are revoked on success (forces re-login
everywhere).

### POST /api/v1/auth/change-password

Bearer required. `204 No Content`.

Request body (`ChangePasswordDto`):

| Field | Type | Notes |
|---|---|---|
| `currentPassword` | string | 1–128 chars |
| `newPassword` | string | 12–128 chars |

All of the user's refresh tokens are revoked on success.

### GET /api/v1/auth/me

Bearer required. `200 OK`. Returns the current `AuthenticatedUser`:

```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "roleId": "uuid",
  "roleName": "IT_REP",
  "permissions": ["asset:read", "repair:read", "repair:manage", "..."]
}
```

---

## 2. Users (Admin)

Controller: `admin-user.controller.ts` — `@Controller('admin/users')`,
class-level `@Roles(SUPER_ADMIN)` + `@RequirePermissions(user:manage)`.
**Every** endpoint in this module is Super-Admin-only.

| Method | Path | Required | Description |
|---|---|---|---|
| GET | `/api/v1/admin/users` | SUPER_ADMIN + `user:manage` | Paginated/searchable user list |
| GET | `/api/v1/admin/users/:id` | SUPER_ADMIN + `user:manage` | Fetch one user |
| POST | `/api/v1/admin/users` | SUPER_ADMIN + `user:manage` | Create a user |
| PATCH | `/api/v1/admin/users/:id` | SUPER_ADMIN + `user:manage` | Update profile fields |
| PATCH | `/api/v1/admin/users/:id/role` | SUPER_ADMIN + `user:manage` | Reassign a user's role |
| POST | `/api/v1/admin/users/:id/deactivate` | SUPER_ADMIN + `user:manage` | Deactivate (soft-disable) a user |
| POST | `/api/v1/admin/users/:id/activate` | SUPER_ADMIN + `user:manage` | Reactivate a user |

> Note: role reassignment is exposed as `PATCH /:id/role` (not
> `POST /:id/change-role`) in the current implementation.

### GET /api/v1/admin/users

Query (`ListUsersQuery`):

| Field | Type | Default | Notes |
|---|---|---|---|
| `page` | int | 1 | ≥1 |
| `pageSize` | int | 20 | 1–200 |
| `search` | string | — | Free-text match |
| `roleId` | uuid | — | Filter by role |
| `isActive` | boolean | — | `true`/`false` |
| `sortField` | enum | — | `lastName`\|`email`\|`lastLoginAt`\|`createdAt` |
| `sortDirection` | enum | `asc` | `asc`\|`desc` |

Response: paginated envelope of `AdminUserDto`.

### POST /api/v1/admin/users

`201 Created`. Body (`AdminCreateUserDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | 1–100 chars, trimmed |
| `lastName` | string | yes | 1–100 chars, trimmed |
| `email` | string | yes | Trimmed + lowercased, unique |
| `roleId` | uuid | yes | Must match a seeded role |
| `password` | string | yes | 12–128 chars |
| `mustChangePassword` | boolean | no | Forces a password reset on next login |

### GET /api/v1/admin/users/:id

Returns `AdminUserDto` or `404 Not Found`.

### PATCH /api/v1/admin/users/:id

Body (`AdminUpdateUserDto`, all optional): `firstName`, `lastName`, `email`.

### PATCH /api/v1/admin/users/:id/role

Body (`AdminChangeRoleDto`): `{ "roleId": "uuid" }`. Guards against
demoting the last remaining Super Admin (`CANNOT_DEMOTE_LAST_ADMIN`) and
against an admin changing their own role (`CANNOT_CHANGE_OWN_ROLE`).

### POST /api/v1/admin/users/:id/deactivate

`200 OK`. Guards against deactivating the last Super Admin or oneself
(`CANNOT_DEACTIVATE_LAST_ADMIN`, `CANNOT_DEACTIVATE_SELF`).

### POST /api/v1/admin/users/:id/activate

`200 OK`. Re-enables a deactivated user.

`AdminUserDto` shape (all list/detail/mutation responses):

```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "roleId": "uuid",
  "isActive": true,
  "lastLoginAt": "2026-07-15T10:00:00.000Z",
  "mustChangePassword": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

---

## 3. Assets

Controller: `asset.controller.ts` — `@Controller('assets')`, class-level
`@Roles(SUPER_ADMIN, STORES_OFFICER, IT_REP, PEOPLE_CULTURE, EMPLOYEE)`
(i.e. every role may reach the controller; per-method permissions narrow
further).

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/assets` | none (row-scoped) | List/search assets |
| GET | `/api/v1/assets/export` | `asset:read` | CSV export of filtered assets |
| GET | `/api/v1/assets/tag/:tag` | `asset:read` | Look up an asset by its tag |
| GET | `/api/v1/assets/:id` | `asset:read` | Fetch one asset |
| GET | `/api/v1/assets/:id/history` | `asset:read` | Status-change history |
| GET | `/api/v1/assets/:id/qr` | `asset:read` | QR code (PNG) encoding the asset tag |
| GET | `/api/v1/assets/:id/barcode` | `asset:read` | Barcode (PNG) encoding the asset tag |
| POST | `/api/v1/assets` | `asset:manage` | Register a new asset |
| PATCH | `/api/v1/assets/:id` | `asset:manage` | Update asset attributes |
| PATCH | `/api/v1/assets/:id/status` | `asset:direct-status` | Direct lifecycle status change (bypasses workflow) |
| DELETE | `/api/v1/assets/:id` | `asset:manage` | Delete an asset |
| POST | `/api/v1/assets/import` | `asset:manage` | Bulk import assets from CSV |

> Note: task naming of `POST :id/change-status` corresponds to the actual
> route `PATCH /api/v1/assets/:id/status`, which requires `asset:direct-status`
> — currently granted only to `SUPER_ADMIN` (see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md)).

**Row-level scoping on `GET /api/v1/assets`:** callers without `asset:read`
(i.e. `EMPLOYEE`, who holds `asset:read-own`) are forced to
`currentHolderId = <their own user id>` regardless of the query param, so
Employees only ever see assets currently assigned to them.

### GET /api/v1/assets

Query (`ListAssetsQuery`):

| Field | Type | Default | Notes |
|---|---|---|---|
| `page` | int | 1 | |
| `pageSize` | int | 20 | 1–500 |
| `search` | string | — | |
| `status` | enum | — | One of the asset statuses below |
| `deviceType` | string | — | |
| `brand` | string | — | |
| `department` | string | — | |
| `currentHolderId` | uuid | — | Ignored/overridden for non-`asset:read` callers |
| `sortField` | enum | — | `assetTag`\|`serialNumber`\|`status`\|`createdAt` |
| `sortDirection` | enum | `asc` | `asc`\|`desc` |

Response: paginated envelope of `AssetDto`.

### GET /api/v1/assets/export

Same filters as list (no paging). Streams `text/csv` with
`Content-Disposition: attachment; filename="assets-YYYY-MM-DD.csv"`.

### GET /api/v1/assets/tag/:tag, GET /api/v1/assets/:id

Returns a single `AssetDto` or `404 ASSET_NOT_FOUND`.

### GET /api/v1/assets/:id/history

Returns an array of status-history entries:

```json
[
  {
    "id": "uuid",
    "assetId": "uuid",
    "fromStatus": "Available",
    "toStatus": "Allocated",
    "changedByUserId": "uuid",
    "reason": "Assigned to employee",
    "occurredAt": "2026-06-01T12:00:00.000Z"
  }
]
```

### GET /api/v1/assets/:id/qr, GET /api/v1/assets/:id/barcode

Stream `image/png`.

### POST /api/v1/assets

`201 Created`. Body (`CreateAssetDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetTag` | string | no | Max 64; auto-generated if omitted |
| `deviceType` | string | yes | Max 64 |
| `brand` | string | yes | Max 128 |
| `model` | string | yes | Max 128 |
| `serialNumber` | string | yes | Max 128, unique |
| `imei` | string\|null | no | Max 32, unique when present |
| `purchaseDate` | date string | no | ISO date |
| `purchaseAmount` | number | no | ≥0 |
| `purchaseCurrency` | string | no | 3-letter ISO code |
| `vendor` | string | no | Max 255 |
| `warrantyExpiry` | date string | no | Must be ≥ `purchaseDate` |
| `officeLocation` | string | no | Max 128 |
| `department` | string | no | Max 128 |
| `notes` | string | no | |
| `markAvailableImmediately` | boolean | no | Skip `Registration` status |

### PATCH /api/v1/assets/:id

Body (`UpdateAssetDto`, all optional): same field set as create minus
`assetTag`, `serialNumber`, `markAvailableImmediately`.

### PATCH /api/v1/assets/:id/status

Body (`ChangeAssetStatusDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `toStatus` | enum | yes | One of the asset statuses below |
| `reason` | string | yes | Max 500 |
| `newHolderId` | uuid\|null | no | Set when transitioning to `Allocated` |

### DELETE /api/v1/assets/:id

`204 No Content`.

### POST /api/v1/assets/import

`200 OK`. Body (`BulkImportDto`): `{ "csv": "string (max 5MB)", "dryRun"?: boolean }`.
Returns a per-row import summary (created/updated/skipped/errors).

**Asset status enum** (`AssetStatus`): `Registration`, `Available`,
`Reserved`, `Allocated`, `Returned`, `UnderRepair`, `Disposed`, `Lost`,
`Stolen`, `Unaccounted`. Direct transitions are constrained by
`AssetLifecycleStateMachine` (e.g. `Disposed` is terminal).

`AssetDto` shape:

```json
{
  "id": "uuid",
  "assetTag": "IT-00042",
  "deviceType": "Laptop",
  "brand": "Dell",
  "model": "Latitude 5540",
  "serialNumber": "SN12345",
  "imei": null,
  "purchaseDate": "2025-01-15",
  "purchaseAmount": 1200.5,
  "purchaseCurrency": "USD",
  "vendor": "Dell Direct",
  "warrantyExpiry": "2028-01-15",
  "officeLocation": "HQ - 3rd Floor",
  "department": "Engineering",
  "currentHolderId": "uuid | null",
  "status": "Allocated",
  "notes": null,
  "createdAt": "2025-01-16T09:00:00.000Z",
  "updatedAt": "2026-06-01T12:00:00.000Z"
}
```

---

## 4. Returns

Controller: `return.controller.ts` — `@Controller('returns')`. No
class-level `@Roles()`; every endpoint requires only authentication unless
noted. `EMPLOYEE` callers are scoped to returns they initiated.

| Method | Path | Required Role(s) | Description |
|---|---|---|---|
| GET | `/api/v1/returns` | any authenticated (row-scoped) | List returns |
| GET | `/api/v1/returns/:id` | any authenticated | Return detail + workflow state |
| POST | `/api/v1/returns` | `EMPLOYEE`, `PEOPLE_CULTURE`, `SUPER_ADMIN` | Initiate a return |
| POST | `/api/v1/returns/:id/items` | `IT_REP`, `STORES_OFFICER`, `SUPER_ADMIN` | Record physically returned items |
| POST | `/api/v1/returns/:id/assessment` | `IT_REP`, `SUPER_ADMIN` | Record condition assessment on the return |
| POST | `/api/v1/returns/:id/sign` | any authenticated (role enforced by workflow) | Apply a sign-off action |
| POST | `/api/v1/returns/:id/cancel` | `PEOPLE_CULTURE`, `SUPER_ADMIN` | Cancel a return |

> Note: task naming of `POST :id/record-items` and `POST :id/complete-assessment`
> corresponds to the actual routes `POST /api/v1/returns/:id/items` and
> `POST /api/v1/returns/:id/assessment`.

### GET /api/v1/returns

Query (`ListReturnsQuery`): `page`, `pageSize` (1–200), `state?`, `assetId?`.
`EMPLOYEE` callers are automatically scoped to
`initiatedByUserId = <self>`. Response: paginated envelope of return DTOs.

### GET /api/v1/returns/:id

Returns the return record plus its live workflow state:

```json
{
  "id": "uuid",
  "assetId": "uuid",
  "holderUserId": "uuid",
  "initiatedByUserId": "uuid",
  "reason": "Resignation",
  "reasonNotes": null,
  "workflowInstanceId": "uuid",
  "currentState": "PendingAssessment",
  "findings": null,
  "damageNotes": null,
  "missingAccessories": null,
  "outcome": null,
  "photoUrls": [],
  "items": [{ "id": "uuid", "itemType": "Laptop", "description": null, "status": "Returned", "notes": null }],
  "createdAt": "2026-06-01T00:00:00.000Z",
  "updatedAt": "2026-06-02T00:00:00.000Z",
  "workflow": {
    "instanceId": "uuid",
    "currentState": "PendingAssessment",
    "completedAt": null,
    "availableActions": ["sign-it"],
    "stages": [ "..." ],
    "history": [ { "fromState": "Initiated", "toState": "PendingAssessment", "actionName": "items-recorded", "actorUserId": "uuid", "signatureName": null, "comment": null, "occurredAt": "..." } ]
  }
}
```

### POST /api/v1/returns

`201 Created`. Body (`InitiateReturnDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetId` | uuid | yes | Must be currently allocated |
| `reason` | enum | yes | `Resignation`\|`Termination`\|`Transfer`\|`Replacement`\|`Repair`\|`Lost`\|`Other` |
| `reasonNotes` | string | no | Max 2000 |

### POST /api/v1/returns/:id/items

`200 OK`. Body (`RecordItemsDto`): `{ "items": [ItemDto, ...] }` where each
`ItemDto` is:

| Field | Type | Required | Notes |
|---|---|---|---|
| `itemType` | enum | yes | `Laptop`\|`Phone`\|`Charger`\|`Mouse`\|`Dock`\|`Keyboard`\|`Monitor`\|`Other` |
| `description` | string | no | Max 255 |
| `status` | enum | yes | `Returned`\|`Missing`\|`Damaged` |
| `notes` | string | no | Max 2000 |

### POST /api/v1/returns/:id/assessment

`200 OK`. Body (`CompleteAssessmentDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `findings` | string | yes | Max 5000 |
| `outcome` | enum | yes | `Pass`\|`RepairRecommended`\|`ReplacementRecommended`\|`Reject` |
| `damageNotes` | string | no | Max 5000 |
| `missingAccessories` | string | no | Max 5000 |
| `photoUrls` | string[] | no | |

### POST /api/v1/returns/:id/sign

`200 OK`. Body (`SignReturnDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `actionName` | enum | yes | `sign-employee`\|`sign-it`\|`sign-pc` |
| `signatureName` | string | yes | Max 255 |

The workflow definition — not a controller `@Roles()` gate — enforces which
role may execute which sign action.

### POST /api/v1/returns/:id/cancel

`200 OK`. Body (`CancelReturnDto`): `{ "reason": "string (max 2000)" }`.

---

## 5. Assessments

Controller: `assessment.controller.ts` — `@Controller('assessments')`. No
class-level `@Roles()`; permission checks only.

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/assessments/templates` | `assessment:read` | List checklist templates |
| GET | `/api/v1/assessments` | `assessment:read` | List assessment records |
| GET | `/api/v1/assessments/:id` | `assessment:read` | Assessment detail + template + suggested outcome |
| POST | `/api/v1/assessments` | `assessment:manage` | Start a new assessment |
| PATCH | `/api/v1/assessments/:id/results` | `assessment:manage` | Save/overwrite checklist item results |
| POST | `/api/v1/assessments/:id/complete` | `assessment:manage` | Finalize the assessment with an outcome |

> Note: task naming of `POST :id/submit` corresponds to the actual route
> `PATCH /api/v1/assessments/:id/results` (there is no separate "submit"
> step — results are saved incrementally and finalized via `.../complete`).

### GET /api/v1/assessments/templates

Returns an array of assessment templates (checklist definitions).

### GET /api/v1/assessments

Query (`ListAssessmentsQuery`): `page`, `pageSize` (1–200), `assetId?`,
`status?` (`Draft`\|`Completed`), `contextType?`
(`Standalone`\|`Allocation`\|`Return`\|`Repair`), `contextId?`.

### GET /api/v1/assessments/:id

Returns the assessment record merged with its template and a
`suggestedOutcome` computed from item results.

### POST /api/v1/assessments

`201 Created`. Body (`StartAssessmentDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetId` | uuid | yes | |
| `contextType` | enum | no | `Standalone`\|`Allocation`\|`Return`\|`Repair` |
| `contextId` | string | no | Max 64 — id of the return/repair/allocation this assessment is attached to |
| `templateKey` | string | no | Defaults to the standard device template |

The technician is taken from the authenticated caller.

### PATCH /api/v1/assessments/:id/results

`200 OK`. Body (`SaveResultsDto`): `{ "entries": [EntryDto, ...] }` where
each `EntryDto` is `{ itemCode: string, result: "Pass"|"Fail"|"NA", note?: string }`.

### POST /api/v1/assessments/:id/complete

`200 OK`. Body (`CompleteAssessmentRecordDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `outcome` | enum | yes | `Pass`\|`RepairRecommended`\|`ReplacementRecommended`\|`Reject` |
| `findings` | string | yes | Max 5000 |
| `recommendations` | string | no | Max 5000 |
| `photoUrls` | string[] | no | |
| `signatureName` | string | yes | Max 255 |

---

## 6. Repairs

Controller: `repair.controller.ts` — `@Controller('repairs')`. No
class-level `@Roles()`; permission checks only.

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/repairs` | `repair:read` | List repair records |
| GET | `/api/v1/repairs/:id` | `repair:read` | Repair detail + status history |
| GET | `/api/v1/repairs/by-asset/:assetId` | `repair:read` | All repairs for one asset |
| POST | `/api/v1/repairs` | `repair:manage` | Open a repair ticket |
| PATCH | `/api/v1/repairs/:id` | `repair:manage` | Update technician/vendor/estimate |
| POST | `/api/v1/repairs/:id/transition` | `repair:manage` | Move the repair to a new status |

### GET /api/v1/repairs

Query (`ListRepairsQuery`): `page`, `pageSize` (1–200), `assetId?`,
`status?`, `technicianUserId?`.

### GET /api/v1/repairs/:id

Returns the repair record plus its status-change `history[]`.

### GET /api/v1/repairs/by-asset/:assetId

Returns an array of `RepairDto` for the given asset.

### POST /api/v1/repairs

`201 Created`. Body (`OpenRepairDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetId` | uuid | yes | |
| `reportedFault` | string | yes | Max 4000 |
| `employeeUserId` | uuid | no | Employee who reported the fault |
| `technicianUserId` | uuid | no | Assigned technician |
| `vendor` | string | no | Max 255 |
| `estimatedCost` | number | no | ≥0 |
| `costCurrency` | string | no | Max 3 |

### PATCH /api/v1/repairs/:id

Body (`UpdateRepairDto`, all optional): `technicianUserId`, `vendor`,
`estimatedCost`.

### POST /api/v1/repairs/:id/transition

`200 OK`. Body (`TransitionRepairDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `toStatus` | enum | yes | See repair status enum below |
| `diagnosis` | string | no | Max 4000 |
| `resolutionNotes` | string | no | Max 4000 |
| `actualCost` | number | no | ≥0 |
| `note` | string | no | Max 2000 |

**Repair status enum** (`RepairStatus`): `Pending`, `Diagnosing`,
`AwaitingParts`, `InProgress`, `Completed`, `Failed`, `BeyondRepair`.
Terminal: `Completed`, `BeyondRepair` (note: `Failed` is **not** terminal —
a failed repair can be re-attempted, `Failed → InProgress`). Allowed
transitions are enforced by `RepairStatusMachine`.

---

## 7. Disposals

Controller: `disposal.controller.ts` — `@Controller('disposals')`. No
class-level `@Roles()`; permission checks only.

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/disposals` | `disposal:read` | List disposal requests |
| GET | `/api/v1/disposals/:id` | `disposal:read` | Disposal detail |
| GET | `/api/v1/disposals/by-asset/:assetId` | `disposal:read` | All disposal requests for one asset |
| POST | `/api/v1/disposals` | `disposal:request` | Request an asset disposal |
| POST | `/api/v1/disposals/:id/approve` | `disposal:approve` | Approve a disposal request |
| POST | `/api/v1/disposals/:id/reject` | `disposal:approve` | Reject a disposal request |

> `disposal:approve` is currently granted only to `SUPER_ADMIN` in the
> seeded RBAC matrix — approve/reject are Super-Admin-only operations today.

### GET /api/v1/disposals

Query (`ListDisposalsQuery`): `page`, `pageSize` (1–200), `assetId?`,
`status?`, `requestedByUserId?`, `approvedByUserId?`.

### GET /api/v1/disposals/:id, GET /api/v1/disposals/by-asset/:assetId

Return `DisposalDto` / `DisposalDto[]`.

### POST /api/v1/disposals

`201 Created`. Body (`RequestDisposalDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetId` | uuid | yes | Must not already have an active disposal request |
| `reason` | enum | yes | `BeyondRepair`\|`Obsolete`\|`Lost`\|`Sold`\|`Donated`\|`Damaged` |
| `method` | enum | yes | `EWasteRecycling`\|`Sold`\|`Donated`\|`Destroyed`\|`ReturnedToVendor`\|`Other` |
| `requestNotes` | string | no | Max 4000 |
| `evidenceUrls` | string[] | no | Max 20 URLs |
| `photoUrls` | string[] | no | Max 20 URLs |

### POST /api/v1/disposals/:id/approve

`200 OK`. Body (`ApproveDisposalDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `signaturePrintedName` | string | yes | 2–255 chars |
| `disposalDate` | date string | yes | ISO date |
| `witnessUserId` | uuid | no | |
| `approvalNotes` | string | no | Max 4000 |

The approver's IP is captured automatically (`@Ip()`) as the signature IP.
Approving flips the underlying asset to `Disposed`.

### POST /api/v1/disposals/:id/reject

`200 OK`. Body (`RejectDisposalDto`): `{ "rejectionReason": "string (2-4000 chars)" }`.

**Disposal status enum** (`DisposalStatus`): `Requested`, `Approved`,
`Rejected` (terminal: `Approved`, `Rejected`).

---

## 8. Notifications

Controller: `notification.controller.ts` — `@Controller('notifications')`.
All endpoints require `notification:read`, which every role holds — this
module is scoped to the caller's own notifications (`recipientUserId`).

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | `notification:read` | List the caller's notifications |
| GET | `/api/v1/notifications/unread-count` | `notification:read` | Unread count for the caller |
| PATCH | `/api/v1/notifications/:id/read` | `notification:read` | Mark one notification read |
| POST | `/api/v1/notifications/mark-all-read` | `notification:read` | Mark all of the caller's notifications read |

### GET /api/v1/notifications

Query (`ListNotificationsQuery`): `page` (default 1), `pageSize` (default
20, max 100), `unreadOnly?` (boolean), `eventType?` (see event types
below). Response: paginated envelope of notification DTOs:

```json
{
  "id": "uuid",
  "recipientUserId": "uuid",
  "channel": "IN_APP",
  "eventType": "REPAIR_COMPLETED",
  "subject": "Repair completed",
  "message": "Asset IT-00042 repair has been completed.",
  "metadata": {},
  "read": false,
  "readAt": null,
  "createdAt": "2026-07-10T08:00:00.000Z"
}
```

`eventType` enum: `ALLOCATION_REQUESTED`, `ALLOCATION_APPROVED`,
`ALLOCATION_REJECTED`, `ASSESSMENT_COMPLETED`, `ASSET_RETURNED`,
`REPAIR_REQUESTED`, `REPAIR_COMPLETED`, `DISPOSAL_APPROVED`, `ESCALATION`,
`SLA_BREACH`. `channel` enum: `IN_APP`, `EMAIL`, `SMS`, `TEAMS`, `SLACK`.

### GET /api/v1/notifications/unread-count

Response: `{ "count": 4 }`.

### PATCH /api/v1/notifications/:id/read

Response: `{ "message": "Marked as read" }`. `403` (`NOTIFICATION_ACCESS_DENIED`)
if the notification does not belong to the caller.

### POST /api/v1/notifications/mark-all-read

Response: `{ "message": "All notifications marked as read", "count": 4 }`.

---

## 9. Reports

Controller: `reporting.controller.ts` — `@Controller('reports')`. All
read endpoints require `report:read`; export requires `report:export`.
Both permissions are granted to `SUPER_ADMIN`, `STORES_OFFICER`,
`IT_REP`, and `PEOPLE_CULTURE` — **not** `EMPLOYEE`.

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/reports/inventory` | `report:read` | Inventory report |
| GET | `/api/v1/reports/allocation` | `report:read` | Allocation report |
| GET | `/api/v1/reports/returns` | `report:read` | Returns report |
| GET | `/api/v1/reports/repairs` | `report:read` | Repairs report |
| GET | `/api/v1/reports/disposals` | `report:read` | Disposals report |
| GET | `/api/v1/reports/employee-asset-history/:userId` | `report:read` | Asset history for one employee |
| GET | `/api/v1/reports/department-summary` | `report:read` | Per-department summary |
| GET | `/api/v1/reports/compliance` | `report:read` | Compliance report |
| GET | `/api/v1/reports/sla-performance` | `report:read` | SLA performance report |
| GET | `/api/v1/reports/dashboard` | `report:read` | Dashboard analytics payload |
| GET | `/api/v1/reports/export` | `report:export` | Export any of the above as CSV/Excel/PDF |

### Common filter query (`ReportFiltersQuery`)

Applies to `inventory`, `allocation`, `returns`, `repairs`, `disposals`,
`sla-performance` (all fields optional):

| Field | Type | Notes |
|---|---|---|
| `dateFrom` | date string | ISO date |
| `dateTo` | date string | ISO date |
| `department` | string | |
| `assetType` | string | |
| `brand` | string | |
| `employeeUserId` | uuid | |
| `status` | string | |

`department-summary`, `compliance`, and `dashboard` take no query params.
`employee-asset-history/:userId` takes only the path param.

### GET /api/v1/reports/export

Query (`ExportQuery` — `ReportFiltersQuery` + the following):

| Field | Type | Required | Notes |
|---|---|---|---|
| `reportType` | enum | yes | `inventory`\|`allocation`\|`returns`\|`repairs`\|`disposals`\|`employee-asset-history`\|`department-summary`\|`compliance`\|`sla-performance`\|`dashboard` |
| `format` | enum | yes | `csv`\|`excel`\|`pdf` |

Streams the file with the matching `Content-Type` and a
`Content-Disposition: attachment; filename="<reportType>-YYYY-MM-DD.<ext>"`
header (`.csv` / `.xls` / `.pdf`).

---

## 10. Dashboard

Controller: `enterprise-dashboard.controller.ts` — `@Controller('dashboard')`.
Both endpoints require `dashboard:read`, which **every** role holds
(including `EMPLOYEE`).

| Method | Path | Required Permission | Description |
|---|---|---|---|
| GET | `/api/v1/dashboard/enterprise` | `dashboard:read` | Full KPI/chart/widget payload |
| GET | `/api/v1/dashboard/enterprise/filter-options` | `dashboard:read` | Valid filter values (departments/offices/asset types) |

### GET /api/v1/dashboard/enterprise

Query (`DashboardFiltersQuery`, all optional): `department`, `office`,
`assetType`, `dateFrom`, `dateTo`. The response is shaped by the caller's
role (`roleName` is passed to the service for role-aware widgets).

Response (`EnterpriseDashboardData`):

```json
{
  "kpis": {
    "totalAssets": 500, "available": 120, "allocated": 300,
    "underRepair": 20, "returned": 15, "disposed": 30,
    "lost": 5, "stolen": 2, "pendingRequests": 8, "pendingApprovals": 3
  },
  "charts": {
    "assetsByDepartment": [{ "label": "Engineering", "value": 120 }],
    "assetsByBrand": [{ "label": "Dell", "value": 200 }],
    "assetsByType": [{ "label": "Laptop", "value": 350 }],
    "allocationTrends": [{ "month": "2026-06", "count": 12 }],
    "returnTrends": [{ "month": "2026-06", "count": 4 }],
    "repairTrends": [{ "month": "2026-06", "count": 3 }],
    "compliancePerformance": [{ "label": "On Time", "value": 92 }]
  },
  "widgets": {
    "recentActivity": [ "..." ],
    "notifications": [ "..." ],
    "pendingTasks": [ "..." ],
    "upcomingWarrantyExpirations": [ "..." ],
    "recentRepairs": [ "..." ],
    "recentlyAddedAssets": [ "..." ]
  },
  "filterOptions": { "departments": ["Engineering"], "offices": ["HQ"], "assetTypes": ["Laptop"] },
  "role": "IT_REP",
  "generatedAt": "2026-07-16T09:00:00.000Z"
}
```

### GET /api/v1/dashboard/enterprise/filter-options

Response: `{ "departments": [...], "offices": [...], "assetTypes": [...] }`.

---

## 11. Audit Logs

Controller: `audit.controller.ts` — `@Controller('audit-logs')`,
class-level `@Roles(SUPER_ADMIN)` + `@RequirePermissions(audit:read)`.
**Super-Admin-only.**

| Method | Path | Required | Description |
|---|---|---|---|
| GET | `/api/v1/audit-logs` | SUPER_ADMIN + `audit:read` | Paginated/filterable audit trail |
| GET | `/api/v1/audit-logs/:id` | SUPER_ADMIN + `audit:read` | Single audit entry |

### GET /api/v1/audit-logs

Query:

| Field | Type | Default | Notes |
|---|---|---|---|
| `page` | int | 1 | |
| `pageSize` | int | 20 | 1–200 |
| `userId` | uuid | — | Filter by acting user |
| `entityType` | string | — | e.g. `Asset`, `User`, `ReturnRecord` |
| `entityId` | string | — | |
| `action` | string | — | e.g. `CREATE`, `UPDATE`, `STATUS_CHANGE` |
| `from` | date | — | Range start |
| `to` | date | — | Range end |

Response: paginated envelope of:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "action": "STATUS_CHANGE",
  "entityType": "Asset",
  "entityId": "uuid",
  "oldValue": { "status": "Available" },
  "newValue": { "status": "Allocated" },
  "ip": "203.0.113.10",
  "userAgent": "Mozilla/5.0 ...",
  "correlationId": "uuid",
  "occurredAt": "2026-07-15T10:00:00.000Z"
}
```

### GET /api/v1/audit-logs/:id

Returns the entry above, or `null` if not found (HTTP 200 with `null` body
— the handler does not throw 404).

---

## 12. Health

Controller: `health.controller.ts` — `@Controller('health')`. Both
endpoints are `@Public()` — no bearer token needed. Intended for
load-balancer/orchestrator probes.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Readiness check (verifies DB connectivity) |
| GET | `/api/v1/health/live` | Public | Liveness check (process is up) |

### GET /api/v1/health

Runs `SELECT 1` against the configured database.

```json
{
  "status": "ok",
  "timestamp": "2026-07-16T09:00:00.000Z",
  "checks": { "database": "ok" }
}
```

`status` becomes `"degraded"` (`checks.database: "error"`) if the query
fails, but the endpoint itself still returns `200 OK` — check the `status`
field, not the HTTP status code, when wiring this into a load balancer.

### GET /api/v1/health/live

```json
{ "status": "ok" }
```

Always returns `200 OK` if the process can handle a request at all — does
not touch the database. Use `/health` for readiness and `/health/live` for
liveness in container orchestrators.

---

## 13. Workflow Engine (internal/configuration API)

Not explicitly requested in the module list above, but present in the
codebase and used internally by the Returns module (and available for
future workflow-driven modules). Controller: `workflow.controller.ts` —
`@Controller('workflows')`.

| Method | Path | Required | Description |
|---|---|---|---|
| GET | `/api/v1/workflows/definitions` | `workflow:read` | List workflow definitions |
| POST | `/api/v1/workflows/definitions` | SUPER_ADMIN + `workflow:configure` | Create a workflow definition |
| POST | `/api/v1/workflows/instances` | `workflow:transition` | Create a workflow instance for a subject |
| GET | `/api/v1/workflows/instances/:id` | `workflow:read` | Instance state, available actions, history |
| POST | `/api/v1/workflows/instances/:id/transition` | `workflow:transition` | Execute a transition action |
| POST | `/api/v1/workflows/instances/:id/bypass` | SUPER_ADMIN + `workflow:bypass` | Force-set an instance's state, skipping the workflow |

`workflow:read` and `workflow:transition` are granted to all 5 roles;
`workflow:configure` and `workflow:bypass` are Super-Admin-only.

---

## 14. RBAC

Controller: `rbac.controller.ts` — `@Controller('rbac')`.

| Method | Path | Required | Description |
|---|---|---|---|
| GET | `/api/v1/rbac/me/permissions` | any authenticated | Caller's role name + permission keys |
| GET | `/api/v1/rbac/roles` | `rbac:read` (SUPER_ADMIN today) | List all seeded roles |

### GET /api/v1/rbac/me/permissions

```json
{ "roleName": "IT_REP", "permissions": ["asset:read", "repair:read", "..."] }
```

### GET /api/v1/rbac/roles

```json
[{ "id": "uuid", "name": "SUPER_ADMIN", "description": "Full system access" }]
```
