# Asset Return Module

Implementation notes for the Asset Return workflow (M5 scope).
Cross-references: [`17-asset-inventory-and-workflow-engine.md`](17-asset-inventory-and-workflow-engine.md)
(engine + asset lifecycle), [`14-backend-implementation-plan.md`](14-backend-implementation-plan.md) §10.

## 1. Architectural decisions

1. **The process is workflow data, not code.** Migration
   `1720500000000-AddAssetReturn` seeds an `asset-return` workflow
   definition. Stages, transitions, allowed roles, signature/comment
   requirements, notification recipients, and audit labels are all rows
   in the engine's config tables. Changing the process (e.g. adding a
   Stores counter-signature) is an UPDATE, not a deploy.
2. **ReturnModule owns only domain data.** `ReturnRecord` (reason,
   items, assessment) + `ReturnItem` children. Process state lives in
   the workflow instance; a denormalized `current_state` column keeps
   list queries cheap and is re-synced after every transition.
3. **Signatures are workflow transitions.** Each `sign-*` action has
   `requiresSignature: true`; the engine rejects unsigned calls, and the
   signature (typed name + IP + timestamp) lands in the append-only
   `workflow_instance_transitions` table — a single audit-grade
   signature store, no duplication.
4. **Completion side-effects are event-driven.** `WorkflowCompletedEvent`
   now carries `subjectType`/`subjectId`; `ReturnWorkflowCompletedHandler`
   reacts, flips the asset through the existing lifecycle-guarded
   `ChangeAssetStatusUseCase` (which writes its own status history), and
   clears `currentHolderId` — that clearing is the allocation-record
   closure until AllocationModule (M4) lands and subscribes to
   `return.completed` itself.
5. **Validation is layered**: DTO shape (class-validator) → engine rules
   (state/role/signature/comment) → domain invariants (items non-empty,
   Missing/Damaged require notes, damaged items require damage notes,
   missing items require the missing-accessory list).

## 2. Workflow graph (seeded)

```
Initiated ──record-items(IT/Stores)──▶ Assessment ──complete-assessment(IT, comment)──▶
AwaitingEmployeeSignature ──sign-employee(Employee, signature)──▶
AwaitingItSignature ──sign-it(IT, signature)──▶
AwaitingPcSignature ──sign-pc(P&C, signature)──▶ Completed ✔

Initiated/Assessment ──cancel(P&C, comment)──▶ Cancelled ✔
```

SUPER_ADMIN is included in every transition's role list (operational
escape hatch — every use is signature/audit logged like anyone else).

## 3. Inventory update on completion

| Condition | Asset path | Final status |
|---|---|---|
| reason `Lost` | Allocated → Lost | `Lost` |
| outcome `Pass` | Allocated → Returned → Available | `Available` |
| outcome `RepairRecommended` / `ReplacementRecommended` | Allocated → Returned → UnderRepair | `UnderRepair` |
| outcome `Reject` | Allocated → Returned | `Returned` (parked for Disposal workflow) |
| workflow `Cancelled` | untouched | unchanged, holder kept |

Every hop is validated by the asset lifecycle state machine and writes
an `asset_status_history` row; `currentHolderId` is cleared on the
first hop.

## 4. Database

- `return_records` — reason (enum-checked in app), reason notes,
  workflow instance id, denormalized `current_state`, assessment fields
  (`findings`, `damage_notes`, `missing_accessories`, `outcome`,
  `photo_urls` jsonb).
- `return_items` — item type (Laptop/Phone/Charger/Mouse/Dock/Keyboard/
  Monitor/Other), per-item status (Returned/Missing/Damaged), notes.
  Replace-all write semantics.
- Seeded workflow definition + 7 stages + 7 transitions
  (deterministic `33333333-…` UUIDs).

## 5. HTTP API (`/returns`)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/returns` | all (Employees see only their own) | Paged list, `state`/`assetId` filters |
| GET | `/returns/:id` | all | Record + full workflow state (stepper stages, caller's available actions, transition history with signatures) |
| POST | `/returns` | Employee, P&C, SA | Initiate (`assetId`, `reason`, notes). Employee must be the holder; asset must be `Allocated`; one active return per asset |
| POST | `/returns/:id/items` | IT, Stores, SA | Record returned items (engine advances Initiated → Assessment) |
| POST | `/returns/:id/assessment` | IT, SA | Findings + outcome + damage notes + missing accessories + optional photo URLs (engine advances to employee signature) |
| POST | `/returns/:id/sign` | any authenticated — the workflow decides | `sign-employee` / `sign-it` / `sign-pc` with typed `signatureName` |
| POST | `/returns/:id/cancel` | P&C, SA | Cancel with mandatory reason (only from Initiated/Assessment, per config) |

Error codes: `RETURN_NOT_FOUND` 404 · `ASSET_NOT_RETURNABLE` 409 ·
`ACTIVE_RETURN_EXISTS` 409 · `NOT_ASSET_HOLDER` 403 ·
`RETURN_ITEMS_REQUIRED` / `RETURN_ITEM_NOTES_REQUIRED` /
`ASSESSMENT_INCOMPLETE` 400 — plus every engine rejection
(`INVALID_TRANSITION`, `ROLE_NOT_ALLOWED_FOR_TRANSITION`,
`TRANSITION_REQUIRES_SIGNATURE`, …).

Related change: `GET /assets` now admits Employees with row-level
scoping (forced `currentHolderId = self` when the caller lacks
`asset:read`) so the return-initiation asset picker works for them.

## 6. Events, audit, notifications

Domain events `return.initiated`, `return.items-recorded`,
`return.assessed`, `return.completed`, `return.cancelled` are published
alongside the engine's `workflow.*` events; all are persisted by
AuditService automatically. Notification trigger points are the
`workflow.stage.entered` events, whose `notificationRecipients` come
from the seeded transition config (Employee ← assessment done, IT ←
items recorded / employee signed, P&C ← IT signed, Employee+Stores ←
completed). NotificationModule (M7) subscribes to these; no return code
changes needed then.

## 7. Frontend

`features/returns/`: **ReturnListPage** (state filter + pagination),
**InitiateReturnPage** (allocated-asset picker, 7 reasons, notes),
**ReturnDetailPage** — a single page that renders whatever the caller
can currently do, driven by the API's `availableActions`:

- workflow `Steps` header + completion/cancellation banners,
- item recording editor (all 8 item types × Returned/Missing/Damaged + notes),
- IT assessment form (findings, outcome, damage notes, missing
  accessories, photo URLs),
- signature card + typed-name modal for whichever `sign-*` action is
  available,
- cancel modal (P&C), and the full transition history timeline with
  signatures.

The FE never hardcodes stage order — the stepper and the action panels
come from the workflow state payload, so config changes flow through
automatically.

## 8. Tests

Unit (13 new):
- `return-record.entity.spec` — item-list invariants (empty, notes on
  Missing/Damaged, replace semantics) and assessment invariants
  (findings required, damage notes / missing list conditional, photos).
- `initiate-return.use-case.spec` — happy path (record + instance +
  events), P&C on-behalf initiation, non-holder employee rejection,
  non-allocated asset rejection, duplicate-active-return rejection,
  unknown asset.

Integration (`test/integration/return-flow.integration.spec.ts`, 5
scenarios) — composes the real use cases, real WorkflowEngine, and the
real completion handler across Return + Workflow + Asset modules with
in-memory repositories and a synchronous event bus:
1. Full journey → Completed, asset Allocated→Returned→Available, holder
   cleared, all five transitions recorded with signatures, full event
   trail (`return.initiated` … `return.completed`).
2. RepairRecommended outcome → asset ends `UnderRepair`.
3. Reason Lost → asset ends `Lost`.
4. Config enforcement: employee cannot `record-items`; unsigned
   `sign-employee` rejected.
5. Cancellation → record `Cancelled`, inventory untouched, holder kept.

Suite totals: **122 backend tests across 25 suites, all passing**;
frontend typecheck + vitest + both production builds clean.
