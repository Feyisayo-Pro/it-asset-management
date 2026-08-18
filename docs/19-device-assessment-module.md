# Device Assessment Module

Implementation notes for the reusable Device Assessment module.
Cross-references: [`18-asset-return-module.md`](18-asset-return-module.md),
[`14-backend-implementation-plan.md`](14-backend-implementation-plan.md) §11.

## 1. Reusability design

Two mechanisms make the module reusable across Allocation, Return,
Repairs, and future inspections:

1. **Versioned checklist templates** (`assessment_templates` +
   `assessment_template_items`). The checklist is data: the migration
   seeds `standard-device-assessment` v1 with the 22 digitized items;
   a battery-health inspection or a phone-specific checklist is a new
   template row — no code change. Templates are immutable per version;
   a revised checklist is a new version under the same key.
2. **Generic context binding**: every `AssessmentRecord` carries
   `contextType` (`Standalone` | `Allocation` | `Return` | `Repair`) +
   optional `contextId` — the same subject pattern the workflow engine
   uses. Consuming modules start an assessment against their own
   context (via the exported `StartAssessmentUseCase`) and subscribe to
   `assessment.completed`, filtering on their contextType, to route
   follow-on actions from the outcome.

## 2. The digitized checklist (22 items, 3 categories)

| Category | Items |
|---|---|
| **Hardware** (12) | Screen, Keyboard, Battery, Charger, Mouse, Webcam, Speakers, Microphone, USB Ports, HDMI, WiFi, Bluetooth |
| **Software** (6) | Operating System, Antivirus, Encryption, Company Software, BitLocker/FileVault, Asset Sticker |
| **Condition** (4) | No Water Damage, No Physical Damage, No Missing Components, Boots Successfully |

Each item is answered `Pass` / `Fail` / `NA` with an optional note
(mandatory when the answer is `Fail`).

**Improvement over the paper form — suggested outcome.** The
`ChecklistScorer` domain service computes an advisory outcome from the
results (boot failure → Reject; any condition failure → Replacement;
≥3 hardware failures → Replacement; any other failure → Repair;
otherwise Pass). It is shown live in the UI and pre-fills the outcome
selector; the technician always confirms or overrides.

## 3. Record lifecycle

```
start (Draft) ──▶ saveResults (partial, repeatable) ──▶ complete ──▶ Completed (immutable)
```

- **Draft**: item results can be saved incrementally (field-technician
  friendly); results upsert by item code.
- **complete()** validates in the domain layer: every required template
  item answered · every `Fail` has a note · findings present ·
  recommendations present for any non-Pass outcome · typed technician
  signature present. It then stamps outcome, findings, recommendations,
  optional photo URLs, signature name + IP + completion timestamp, and
  freezes the record — any later mutation throws
  `ASSESSMENT_ALREADY_COMPLETED`.

Stored per record: findings, photos (URL list), recommendations,
timestamps (started/completed), technician user id, digital signature
(typed name + IP).

## 4. Database

Migration `1720600000000-AddDeviceAssessment`:
`assessment_templates`, `assessment_template_items` (unique
template+code), `assessment_records` (indexed by asset, context,
status), `assessment_item_results` (unique record+code). Seeds the
standard template (22 items) and permissions: `assessment:manage`
(SA, IT) and `assessment:read` (SA, IT, Stores, P&C).

## 5. HTTP API (`/assessments`)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/assessments/templates` | read | Active templates with items |
| GET | `/assessments` | read | Paged list; filters: `assetId`, `status`, `contextType`, `contextId` |
| GET | `/assessments/:id` | read | Record + its template + live `suggestedOutcome` |
| POST | `/assessments` | manage | Start a draft (`assetId`, optional context + templateKey; template defaults to the standard checklist; technician = caller) |
| PATCH | `/assessments/:id/results` | manage | Upsert item results (draft only) |
| POST | `/assessments/:id/complete` | manage | Outcome + findings + recommendations + photos + signature; freezes the record |

Error codes: `ASSESSMENT_NOT_FOUND` / `ASSESSMENT_TEMPLATE_NOT_FOUND`
404 · `ASSESSMENT_ALREADY_COMPLETED` 409 · `UNKNOWN_CHECKLIST_ITEM`,
`CHECKLIST_INCOMPLETE`, `FAILED_ITEM_NOTE_REQUIRED`,
`ASSESSMENT_SIGNATURE_REQUIRED`, `RECOMMENDATIONS_REQUIRED` 400.

## 6. Events & audit

`assessment.started` and `assessment.completed` (payload includes
contextType/contextId/outcome) are published and auto-persisted by
AuditService. `assessment.completed` is the integration surface for
outcome routing (WF-8): AllocationModule (M4) and RepairModule (M6)
subscribe when they land; the existing Return flow can adopt it by
starting assessments with `contextType: 'Return'`.

## 7. Frontend

`features/assessments/`: **AssessmentListPage** (status filter,
outcome tags), **StartAssessmentPage** (asset picker + context
binding), **AssessmentDetailPage** — one page for both phases:

- Draft: checklist grouped by Hardware/Software/Condition with
  Pass/Fail/NA button groups + per-item notes (error-highlighted when a
  Fail lacks a note), live "answered X of 22 · suggested outcome"
  banner, Save-progress button, and a Complete modal (outcome
  pre-filled with the suggestion, findings, recommendations, photo
  URLs, typed signature).
- Completed: everything read-only with the completion banner showing
  outcome, timestamp, and signature.

Sidebar gains an Assessments item (hidden for Employees, matching the
`assessment:read` grant).

## 8. Tests (17 new; suite total 139 across 28 suites)

- `assessment-record.entity.spec` (8) — draft state, unknown-item
  rejection, upsert semantics, incomplete-checklist rejection,
  fail-note requirement, recommendations requirement, signature
  requirement, successful completion + immutability.
- `checklist-scorer.spec` (5) — Pass, boot-failure → Reject, condition
  failure → Replacement, 3+ hardware failures → Replacement, isolated
  failure → Repair.
- `assessment-use-cases.spec` (4) — full start→save→complete journey
  with event payload assertions, unknown asset, unknown template,
  defaulting (Standalone + standard template).

Frontend typecheck, vitest, and both production builds clean.
