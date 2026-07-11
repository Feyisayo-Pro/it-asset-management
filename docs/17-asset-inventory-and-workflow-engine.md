# Asset Inventory & Workflow Engine

Implementation notes for the Asset Inventory module, the append-only
Audit Log module, and the reusable Workflow Engine. Cross-references:
architecture §8–9 (state machine + engine), §12 (audit),
[`14-backend-implementation-plan.md`](14-backend-implementation-plan.md)
§4 (AssetModule), §8 (WorkflowModule), §14 (AuditModule).

---

## 1. Asset Inventory

### 1.1 Domain

- **`Asset`** aggregate root — all mutations go through entity methods:
  `register` (factory), `updateDetails` (warranty ≥ purchase-date
  invariant), `changeStatus` (guarded by the lifecycle state machine).
- **`AssetLifecycleStateMachine`** — the legal status graph
  (Registration → Available → Reserved/Allocated → Returned/UnderRepair
  → … → Disposed/Lost/Stolen/Unaccounted). `Disposed` is terminal —
  no transition out (recovery will be a privileged DisposalModule path).
- **`AssetStatusHistory`** — append-only child records; every status
  change writes one row with actor, reason, timestamp.
- **`AssetTagGenerator`** — deterministic `AST-{year}-{seq:5}` format;
  callers may also supply their own tag (legacy imports keep theirs).
- **`Money`** value object — amounts stored as integer cents + ISO-4217
  currency.

### 1.2 HTTP API (`/assets`)

All routes require Bearer auth; roles allowed on the controller:
SA / Stores / IT / P&C. Writes additionally need `asset:manage`;
direct status change needs `asset:direct-status` (SA-only in the seed).

| Method | Path | Purpose |
|---|---|---|
| GET | `/assets` | List — search (`tag/serial/IMEI/brand/model` substring), filters (`status`, `deviceType`, `brand`, `department`, `currentHolderId`), sort, pagination (max 500/page) |
| GET | `/assets/export` | CSV export honouring the same filters (chunked reads, streams the full result set) |
| GET | `/assets/:id` · `/assets/tag/:tag` | Detail by id or tag |
| GET | `/assets/:id/history` | Append-only status history |
| GET | `/assets/:id/qr` · `/assets/:id/barcode` | PNG QR code / Code-128 barcode of the asset tag (bwip-js, server-side) |
| POST | `/assets` | Register (auto-tag when omitted; optional `markAvailableImmediately`) |
| PATCH | `/assets/:id` | Update details (IMEI uniqueness re-checked) |
| PATCH | `/assets/:id/status` | Direct status change (bypass path, `asset:direct-status`) |
| DELETE | `/assets/:id` | Hard delete — **only** while still in `Registration`; anything with lifecycle history must be disposed, never deleted |
| POST | `/assets/import` | Bulk CSV import with `dryRun` flag |

**Error codes**: `ASSET_NOT_FOUND` (404), `DUPLICATE_ASSET_TAG` /
`DUPLICATE_SERIAL_NUMBER` / `DUPLICATE_IMEI` /
`INVALID_ASSET_STATUS_TRANSITION` (409), `ASSET_WARRANTY_BEFORE_PURCHASE` (400).

### 1.3 Bulk import

CSV with headers (normalized to snake_case). Required columns:
`device_type, brand, model, serial_number`. Optional: `asset_tag`
(auto-generated when blank), `imei`, `purchase_date`, `purchase_amount`,
`purchase_currency`, `vendor`, `warranty_expiry`, `office_location`,
`department`, `notes`.

Per-row validation detects: missing required columns, duplicate
tag/serial/IMEI both **within the file** and **against the database**.
`dryRun: true` returns the full per-row report without writing; the
commit run persists only valid rows and emits `asset.bulk-imported`.
The FE Import page enforces the dry-run-first flow.

### 1.4 Bulk export

`GET /assets/export` streams CSV (same columns as import, plus `status`
and `current_holder_id`) so an exported file round-trips through import.

### 1.5 Database

Migration `1720300000000-AddAssetInventory`: `assets` (unique tag,
unique serial, partial-unique IMEI, status/holder/device-type indexes),
`asset_accessories`, `asset_status_history` (append-only).

---

## 2. Audit Log module

Migration `1720200000000-AddAuditLog`: `audit_logs` table with
user/entity/occurred-at indexes and the `audit:read` permission (SA).

- **Write path**: `AuditService.log()` — the only writer. The
  repository interface exposes `append` + reads only; there is no
  update/delete method to call.
- **Event-driven capture**: `AuditService` subscribes (via
  `@OnEvent`) to every auth-admin, asset, and workflow domain event and
  persists it automatically with actor, IP, user-agent, and correlation
  id pulled from `AsyncLocalStorage` — callers don't pass context.
- **Read API**: `GET /audit-logs` (SA + `audit:read`) with filters
  (`userId`, `entityType`, `entityId`, `action`, `from`, `to`) and
  pagination; `GET /audit-logs/:id` for one entry.
- Audit write failures are logged, never propagated — an audit outage
  cannot take down the business flow.

---

## 3. Workflow Engine

The reusable core mandated by PROJECT_PROMPT §WORKFLOW ENGINE. **No
workflow is hardcoded** — Allocation, Return, Assessment routing,
Repair, and Disposal are all *data* (a `WorkflowDefinition` row plus
stages/transitions), evaluated by one engine.

### 3.1 Configuration model

A **definition** (`key` + `version`) declares:

| Element | Where | Content |
|---|---|---|
| **States** | `workflow_stages` | `state`, human `label`, `requiredRoles` (who acts at this stage), optional `slaMinutes`, `sortOrder` |
| **Transitions** | `workflow_transitions_config` | `fromState → toState` under an `actionName`, with `requiredRoles`, validation flags, notification recipients, and an `auditAction` label |
| **Allowed roles** | per-stage and per-transition `requiredRoles` | Empty list = any authenticated role |
| **Validation rules** | `requiresSignature` / `requiresEvidence` / `requiresComment` | Enforced by the engine before any state change |
| **Events** | emitted by use cases | `workflow.instance.created`, `workflow.stage.entered`, `workflow.stage.completed`, `workflow.completed`, `workflow.bypassed` |
| **Notifications** | `notificationRecipients` on each transition | Role names to notify on stage entry; carried in the `stage.entered` event for NotificationModule (M7) to fan out |
| **Audit entries** | automatic | Every workflow event is persisted by AuditService; every executed transition is additionally an append-only `workflow_instance_transitions` row with actor, signature, evidence, comment |

`initialState` and `finalStates` complete the graph. `WorkflowDefinition.create`
validates referential integrity (initial state exists; every transition's
endpoints exist).

### 3.2 Execution model

- **`WorkflowInstance`** — one execution of a definition against a
  subject (`subjectType` + `subjectId`, unique together). Tracks
  `currentState`, stage-entry timestamp (SLA anchor), completion, and
  bypass metadata.
- **`WorkflowEngine`** (pure domain service, zero I/O) —
  `evaluate(definition, instance, input)` returns the target state +
  side-effect metadata or throws a typed rejection:
  `INVALID_TRANSITION`, `ROLE_NOT_ALLOWED_FOR_TRANSITION`,
  `TRANSITION_REQUIRES_SIGNATURE|EVIDENCE|COMMENT`,
  `WORKFLOW_ALREADY_COMPLETED`. `availableActions(definition, instance,
  role)` powers the FE action bar.
- **Use cases** own all I/O: `CreateWorkflowInstance` (one per subject),
  `TransitionWorkflow` (evaluate → move → append transition record →
  emit events), `BypassWorkflow` (SA-only expedited jump — records a
  `bypass` transition and flags the instance so Compliance can surface
  it), `GetWorkflowState`, `CreateWorkflowDefinition`,
  `ListWorkflowDefinitions`.

### 3.3 HTTP API (`/workflows`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/workflows/definitions` | `workflow:read` | All definitions with stages + transitions |
| POST | `/workflows/definitions` | SA + `workflow:configure` | Create a definition (full graph in one payload) |
| POST | `/workflows/instances` | `workflow:transition` | Start an instance for a subject |
| GET | `/workflows/instances/:id` | `workflow:read` | Current state + caller's available actions + full transition history |
| POST | `/workflows/instances/:id/transition` | `workflow:transition` (+ per-transition role check in the engine) | Execute an action; accepts signature/evidence/comment |
| POST | `/workflows/instances/:id/bypass` | SA + `workflow:bypass` | Expedited jump with mandatory reason |

### 3.4 Adding a future workflow

No code required for the state machine itself:

1. `POST /workflows/definitions` with the states/transitions/roles/rules.
2. Feature module calls `CreateWorkflowInstanceUseCase` with its subject.
3. Screens read `GET /workflows/instances/:id` and post transitions.

Domain side-effects (e.g. "flip the asset to Allocated when the
allocation completes") subscribe to `workflow.completed` /
`workflow.stage.entered` events in the owning feature module.

---

## 4. Frontend

New under `features/assets/`: `AssetListPage` (search + status filter +
pagination + row actions), `AssetCreatePage`/`AssetEditPage` (shared
`AssetForm`, react-hook-form + zod), `AssetDetailPage` (descriptions,
QR + barcode render, status-history timeline), `AssetImportPage`
(paste/upload CSV → dry-run report table → commit), `AssetStatusBadge`.
API modules `assets.api.ts` and `workflows.api.ts`; query keys extended;
sidebar gains an Assets item (Users stays SA-only); post-login landing
is now `/assets`.

## 5. Tests

Backend (**27 new; 103 total, all passing**):

- `asset.entity.spec` — tag normalization, initial status, warranty
  invariant, legal/illegal transitions, Disposed terminality.
- `register-asset.use-case.spec` — sequential tag generation, duplicate
  tag/serial/IMEI rejection, event + initial-history append,
  `markAvailableImmediately` double-entry.
- `change-asset-status.use-case.spec` — happy path with holder + history
  + event, unknown asset, illegal transition.
- `bulk-import-assets.use-case.spec` — dry-run reporting without writes,
  partial-success commit, in-file + against-DB duplicate detection.
- `workflow-engine.spec` — legal transition metadata, final-state
  flagging, unknown action, role rejection, signature/evidence/comment
  validation, completed-instance rejection, `availableActions` filtering.

Frontend: 11 vitest cases (user schemas) still passing; typecheck and
production builds clean on both packages.
