# Repair & Maintenance and Asset Disposal Modules

This doc covers the two lifecycle modules landed together: **Repair &
Maintenance** and **Asset Disposal**. They share a migration and both
route their side-effects through the existing
`ChangeAssetStatusUseCase` so `asset_status_history` remains the single
source of truth for an asset's timeline.

## 1. Repair & Maintenance

### 1.1 Data model

Table `repair_records`

| Column | Purpose |
| --- | --- |
| `id` uuid | PK |
| `asset_id` uuid → `assets` | Restricted FK — a disposed asset should never appear here |
| `employee_user_id` uuid? | Employee who reported / owned it at intake |
| `technician_user_id` uuid? | Internal technician assigned |
| `vendor` varchar? | External vendor (if outsourced) |
| `reported_fault` text | What the user reported |
| `diagnosis` text? | What the technician found |
| `resolution_notes` text? | Required to close as Completed |
| `status` varchar(24) | One of `Pending / Diagnosing / AwaitingParts / InProgress / Completed / Failed / BeyondRepair` |
| `estimated_cost_cents` bigint? | Cost estimate at intake |
| `actual_cost_cents` bigint? | Required to close as Completed |
| `cost_currency` char(3) | ISO 4217, defaults `USD` |
| `warranty_active_at_intake` bool? | Snapshot at repair open — supports later warranty claims |
| `reported_at`, `started_at`, `completed_at` | Timestamps |

Table `repair_status_history` — append-only audit log for the status
machine (from → to, note, changed-by, timestamp).

Indexes: `(asset_id, reported_at DESC)`, `(status)`,
`(technician_user_id)`.

### 1.2 Status machine

```
Pending ─┬─▶ Diagnosing ─┬─▶ AwaitingParts ─┬─▶ InProgress ─┬─▶ Completed  (terminal)
         │               │                  │               ├─▶ Failed ─┬─▶ InProgress
         │               │                  │               │           └─▶ BeyondRepair
         └────────────── ▼ ─────────────── ▼ ──────────────▼─▶ BeyondRepair (terminal)
```

- `Failed` is deliberately **not** terminal — a repair can be re-attempted.
- Completing a repair requires both `resolution_notes` and
  `actual_cost_cents`. This is enforced in the aggregate, not the DTO.

### 1.3 Aggregate + use cases

- `RepairRecord.open(...)` — factory. Records `warrantyActiveAtIntake`
  by comparing the asset's `warrantyExpiry` against `now`.
- `RepairRecord.assign(...)` — technician / vendor / cost updates.
  Blocked once terminal.
- `RepairRecord.transition(...)` — runs `RepairStatusMachine`, records
  `startedAt` on the first non-Pending step, `completedAt` on any
  terminal step.

Application layer:

- `OpenRepairUseCase` — rejects if an active repair already exists for
  the asset, flips the asset to `UnderRepair` via
  `ChangeAssetStatusUseCase`, seeds an initial history row, emits
  `repair.opened`.
- `UpdateRepairUseCase` — technician / vendor / estimated-cost patch.
- `TransitionRepairUseCase` — mutates the aggregate, appends history,
  emits `repair.status-changed` plus one of:
    - `repair.completed` for `Completed` or `Failed` outcomes.
    - `repair.beyond-repair` for `BeyondRepair`.
- `GetRepairUseCase` — read-only queries (by id + history, list, list
  for asset).

### 1.4 Event handler

`RepairCompletedHandler` (`@OnEvent('repair.completed')`) is the only
place that flips the asset status after a repair:

| Outcome | Asset status action |
| --- | --- |
| `Completed` | flip to `Available` |
| `Failed` | leave in `UnderRepair` (someone will retry) |
| `BeyondRepair` | leave in `UnderRepair` (waits for a Disposal request) |

Because the flip goes through `ChangeAssetStatusUseCase`, an
`asset.status-changed` audit entry is written and `asset_status_history`
records the change — the asset's timeline shows the repair alongside
allocations and returns.

### 1.5 HTTP surface (`/repairs`)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/repairs` | `repair:read` | Paginated list |
| GET | `/repairs/:id` | `repair:read` | Includes status history |
| GET | `/repairs/by-asset/:assetId` | `repair:read` | For asset detail pages |
| POST | `/repairs` | `repair:manage` | Opens a repair |
| PATCH | `/repairs/:id` | `repair:manage` | Update assignment |
| POST | `/repairs/:id/transition` | `repair:manage` | Move to next status |

## 2. Asset Disposal

### 2.1 Data model

Table `disposal_records`

| Column | Purpose |
| --- | --- |
| `id` uuid | PK |
| `asset_id` uuid → `assets` | Restricted FK |
| `requested_by_user_id` uuid | Who filed the request |
| `approved_by_user_id` uuid? | Who resolved it |
| `witness_user_id` uuid? | Optional independent witness |
| `reason` varchar(32) | `BeyondRepair / Obsolete / Lost / Sold / Donated / Damaged` |
| `method` varchar(32) | `EWasteRecycling / Sold / Donated / Destroyed / ReturnedToVendor / Other` |
| `status` varchar(16) | `Requested / Approved / Rejected` |
| `request_notes`, `approval_notes`, `rejection_reason` text | Free-form context |
| `signature_name` varchar(255)? | Typed signature at approval time |
| `signature_ip` varchar(64)? | IP captured from the approval request |
| `evidence_urls`, `photo_urls` jsonb | URL arrays |
| `disposal_date` date? | The physical disposal date |
| `requested_at`, `approved_at`, `created_at`, `updated_at` | Timestamps |

Partial unique index `uq_disposal_active_per_asset` on `(asset_id)
WHERE status = 'Requested'` — at most one open request per asset at a
time.

### 2.2 Aggregate invariants (`DisposalRecord`)

1. At least one evidence or photo URL is required at request time.
2. Once resolved (`Approved` or `Rejected`) the record cannot be
   mutated further.
3. **Segregation of duties** — the approver must be a different user
   from the requester. Enforced in `approve()` and `reject()` and
   surfaced with the `DISPOSAL_REQUESTER_CANNOT_APPROVE` error code
   (HTTP 403).
4. Approval requires a non-empty typed signature (captured through
   `ApproverSignature.create(...)`).
5. Rejection requires a non-empty reason.

### 2.3 Use cases

- `RequestDisposalUseCase` — rejects `AssetAlreadyDisposedError` and
  `ActiveDisposalExistsError`, emits `disposal.requested`.
- `ApproveDisposalUseCase` — builds an `ApproverSignature`, calls
  `record.approve(...)`, emits `disposal.approved`. The event handler
  then flips the asset to `Disposed`.
- `RejectDisposalUseCase` — emits `disposal.rejected`.
- `GetDisposalUseCase` — read-only queries.

### 2.4 Event handler

`DisposalApprovedHandler` (`@OnEvent('disposal.approved')`) routes the
asset flip through `ChangeAssetStatusUseCase` with
`toStatus = Disposed`. Because `Disposed` is a terminal state in
`AssetLifecycleStateMachine` (no allowed next states) the platform
naturally enforces the three "cannot" rules:

- **Cannot be allocated again** — `ChangeAssetStatusUseCase` refuses
  any transition out of `Disposed`.
- **Cannot be edited** — `UpdateAssetUseCase` short-circuits with
  `AssetAlreadyDisposedError` when the asset is `Disposed`.
- **Cannot be deleted** — `DeleteAssetUseCase` only accepts assets in
  `Registration`; anything with lifecycle history is retained.

### 2.5 HTTP surface (`/disposals`)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/disposals` | `disposal:read` | Paginated list |
| GET | `/disposals/:id` | `disposal:read` | Single record |
| GET | `/disposals/by-asset/:assetId` | `disposal:read` | For asset detail |
| POST | `/disposals` | `disposal:request` | File a new request |
| POST | `/disposals/:id/approve` | `disposal:approve` | Requires typed signature |
| POST | `/disposals/:id/reject` | `disposal:approve` | Requires a reason |

### 2.6 Permissions & default grants

Added by the migration:

| Role | Permissions |
| --- | --- |
| Super Admin | `repair:*`, `disposal:*` |
| IT Rep | `repair:read`, `repair:manage`, `disposal:read` |
| Stores Officer | `repair:read`, `disposal:read`, `disposal:request` |
| P&C | `repair:read`, `disposal:read` |

Only Super Admin has `disposal:approve` by design — segregation of
duties is enforced twice (RBAC first, then the domain invariant that
approver ≠ requester).

## 3. Audit

Every domain event this pair produces is added to
`AuditService`'s `@OnEvent` list:

- `repair.opened`, `repair.status-changed`, `repair.completed`, `repair.beyond-repair`
- `disposal.requested`, `disposal.approved`, `disposal.rejected`

The audit row's `entity_type` comes from the event namespace
(`repair` / `disposal`); the `entity_id` is the aggregate id.

## 4. Frontend

Feature folders `features/repairs/` and `features/disposals/`, each with:

- `hooks/useRepairs.ts` / `hooks/useDisposals.ts` — TanStack Query
  mutations + invalidation. Both invalidate the assets cache after any
  write so status changes surface immediately on asset pages.
- `pages/*ListPage` — filtered, paginated tables.
- `pages/OpenRepairPage` / `pages/RequestDisposalPage` — creation forms
  with inline validation and API-error banners.
- `pages/*DetailPage` — status timeline, transition modals, signature
  capture (disposal approval), witness field.

Sidebar links added under **Repairs** and **Disposals**, visible to all
non-Employee roles. The Disposal Detail page hides Approve/Reject
buttons unless the user holds `disposal:approve`; it also disables the
buttons when the current user is the requester.

## 5. Tests

Unit tests added:

- `test/unit/repair/repair-status-machine.spec.ts` — state machine invariants
- `test/unit/repair/repair-record.entity.spec.ts` — aggregate invariants
- `test/unit/repair/open-repair.use-case.spec.ts` — active-repair guard, warranty snapshot, status flip
- `test/unit/repair/transition-repair.use-case.spec.ts` — happy path, Failed no-flip, BeyondRepair no-flip
- `test/unit/disposal/disposal-record.entity.spec.ts` — evidence, signature, SoD, rejection
- `test/unit/disposal/request-disposal.use-case.spec.ts` — dedup + already-disposed guards
- `test/unit/disposal/approve-disposal.use-case.spec.ts` — end-to-end approval flip + SoD

Full suite: **180 passing**.
