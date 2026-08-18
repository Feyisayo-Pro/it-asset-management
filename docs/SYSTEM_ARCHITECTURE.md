# System Architecture — Current Implementation State

This documents the system **as actually built**, as of 2026-08-18 —
distinct from [`09-architecture.md`](09-architecture.md), which is the
**original Phase 2 design document** written before implementation began
("pre-implementation" is literally in its header). Where the two differ,
this file reflects reality; `09-architecture.md` is the historical record
of what was originally planned. For the broader design rationale
(bounded contexts, DDD approach, workflow engine, RBAC, etc.) that hasn't
changed, `09-architecture.md` is still the right reference — this file
covers four things specifically, at the request that produced it: the
Asset Lifecycle State Machine, the Device Assessment checklist, the
HardwareSpecValidator role-level matrix, and the baseline inventory +
audit history pattern.

For day-to-day conventions and drift-prevention rules (what to keep
consistent if you're extending any of this), see [`CLAUDE.md`](../CLAUDE.md)
— that file is the one kept continuously up to date across this project's
sessions and is the more authoritative source for "how do I extend this
correctly." This document is a point-in-time architectural summary.

---

## 1. Asset Lifecycle State Machine

Enforced by `AssetLifecycleStateMachine`
(`packages/backend/src/modules/asset/domain/value-objects/asset-status.ts`),
called from `Asset.changeStatus()` on the domain aggregate — every status
change in the system goes through this, whether it originates from
`PATCH /assets/:id/status`, the bulk CSV importer, or the full inventory
seed script. There is no code path that writes `status` directly.

```
Registration → Available, Unaccounted
Available    → Reserved, Allocated, UnderRepair, Disposed, Lost, Stolen, Unaccounted
Reserved     → Available, Allocated
Allocated    → Returned, UnderRepair, Lost, Stolen
Returned     → Available, UnderRepair, Disposed
UnderRepair  → Available, Disposed
Disposed     → (terminal — no outbound transitions)
Lost         → Available, Unaccounted
Stolen       → Available, Unaccounted
Unaccounted  → Available, Lost, Stolen
```

**`Disposed` is a hard terminal state.** The only sanctioned way back is a
Super Admin recovery flow scoped to the Disposal module — there is no
general-purpose bypass, and nothing else in the codebase should add one.

**Invalid transitions throw, they don't fail silently**:
`InvalidAssetStatusTransitionError` (a `DomainError`, not a raw NestJS
exception — the domain layer stays framework-free by design) is mapped to
HTTP `409 Conflict` by `GlobalExceptionFilter.mapDomainToStatus()`. Every
status-changing code path — direct API calls, bulk import, and the
inventory seed script — walks this table explicitly rather than writing a
target status directly; the full inventory seed, for example, always
transitions `Registration → Available → <source-derived status>`, never
straight to the target, even though it would be one line shorter to do so.

---

## 2. Device Assessment Module

### 2.1 The checklist: 8 items, matching the real client form exactly

The seeded `standard-device-assessment` template
(`assessment_templates`/`assessment_template_items`) has **8 items**,
verified directly against the client's `DEVICE ASSESSMENT FORM.docx` (the
actual file, not a paraphrase of it):

| Order | Code | Label | Category |
|---|---|---|---|
| 1 | `screen_intact` | Screen Intact | Hardware |
| 2 | `keyboard_functional` | Keyboard Functional | Hardware |
| 3 | `charger_available` | Charger Available | Hardware |
| 4 | `no_water_damage` | No Water Damage | Condition |
| 5 | `no_missing_components` | No Missing Components | Condition |
| 6 | `hard_drive_functional` | Hard Drive Functional | Hardware |
| 7 | `os_functional` | Operating System Functional | Software |
| 8 | `device_powers_on` | Device Powers On | Hardware |

Each item is answered `Pass` / `Fail` / `NA` (`ItemResult` — unrelated to
the assessment-level outcome below, despite the overlapping vocabulary). A
`Fail` requires a note (`FailedItemNoteRequiredError` if missing).

### 2.2 Assessment outcome: 3 values, no "Reject"

```ts
AssessmentOutcome = 'NoFaultFound' | 'RepairRecommended' | 'ReplacementRecommended'
```

Matches the form's own outcome section exactly. This replaced an earlier
22-item / 4-outcome scheme (which included a `Reject` value with no real
form counterpart) that had been built from a prompt summary before the
actual form was available — see migration
`ReconcileDeviceAssessmentChecklist1721200000000`, applied in place against
template v1 (no completed assessment records existed yet to preserve a
historical item set for).

Completing an assessment with any outcome other than `NoFaultFound`
requires `recommendations` to be non-empty
(`RecommendationsRequiredError` otherwise) — this rule lives on the
`AssessmentRecord` domain entity, not the DTO, so it's enforced regardless
of caller.

### 2.3 `ChecklistScorer` — advisory outcome suggestion

`ChecklistScorer.suggest()` (domain service, pure function) computes a
*suggested* outcome from item results — always advisory; the technician
confirms or overrides on completion, it's never auto-applied.

- `device_powers_on` Fail → `ReplacementRecommended` (this is what used to
  map to `Reject` before §2.2's reconciliation — the closest real outcome
  to "this device is not viable," since the real form has no Reject).
- Any `Condition`-category Fail (`no_water_damage`, `no_missing_components`)
  → `ReplacementRecommended`.
- 2+ `Hardware`-category failures → `ReplacementRecommended` (lower than
  the pre-reconciliation 3-of-12 threshold, proportional to there now
  being only 5 hardware items instead of 12).
- Any other single failure → `RepairRecommended`.
- No failures → `NoFaultFound`.

### 2.4 Context types and the "IT Technical Assessment" integration point

An assessment record's `contextType` is one of `Standalone`, `Allocation`,
`Return`, `Repair`. There is no separate multi-stage "Asset Allocation
workflow" in this system (unlike Returns, which do run through the generic
workflow engine) — allocation is a direct status change
(`PATCH /assets/:id/status`). `AssessmentContextType.Allocation` is what
actually models "an IT technical assessment performed in the context of
allocating this device" — that's the real integration point
`HardwareSpecValidator` (§3) hooks into, at assessment completion.

---

## 3. HardwareSpecValidator — Role-Level Hardware Spec Matrix

`HardwareSpecValidator`
(`packages/backend/src/modules/asset/domain/services/hardware-spec-validator.ts`)
compares a device's `{cpuTier, ramGb, storageGb}` against a job **role
level**'s minimum, returning soft, non-blocking warnings — it never throws
and never blocks completion. Wired into `CompleteAssessmentRecordUseCase`,
firing only when the assessment's `contextType` is `Allocation` **and**
both `targetRoleLevel` and `deviceSpec` are supplied by the caller (both
optional — omitting either simply skips the check).

### 3.1 Why role level, not department or `RoleName`

The system has no persisted job-role/seniority field anywhere. `RoleName`
(`SUPER_ADMIN`/`STORES_OFFICER`/`IT_REP`/`PEOPLE_CULTURE`/`EMPLOYEE`) is
access-control, not job classification, and `Asset.department` is an
organizational unit, not a seniority level. The client's real IT Hardware
Specifications Matrix (`docs/22-sapphire-virtual-source-data.md` §1) is
keyed on job role level — matching the real SOP ("IT matches the job role
against the IT Hardware Specifications Matrix" during device issuance) —
so `targetRoleLevel` is caller-supplied at assessment-completion time
rather than read off a stored record.

### 3.2 The matrix (real, client-supplied — not placeholder data)

| Role Level | Min CPU Tier | Min RAM | Min Storage |
|---|---|---|---|
| Operative | Entry (i3 / Ryzen 3 equivalent) | 8GB | 256GB |
| Officer | Standard (i5 / Ryzen 5 equivalent) | 8GB | 256GB |
| Senior Officer | Standard | 8GB | 256GB |
| Assistant Manager | Standard | 16GB | 512GB |
| Manager | Standard | 16GB | 512GB |
| Senior Manager | Standard (i5/i7 — floors at Standard) | 16GB | 512GB |
| Assistant General Manager | Standard | 16GB | 512GB |
| Deputy General Manager | Standard | 16GB | 512GB |
| General Manager | Performance (i7/i9 / MacBook Pro) | 16GB | 512GB |
| Director | *(none — "Executive Custom Request")* | — | — |

`CpuTier` is a 3-value ordinal (`Entry < Standard < Performance`), not a
literal string match against "i5"/"i7" — the matrix's "i5/i7 or Ryzen 5/7"
phrasing means "i5-or-better is acceptable," which the ordinal comparison
captures directly. `Director` has `requirement: null` in
`ROLE_LEVEL_SPEC_REQUIREMENTS` — deliberately a no-op, not a failure; that
tier is manually approved per the SOP, with nothing to automate.

---

## 4. Baseline Inventory

**136 laptops + 73 phones = 209 assets**, seeded from the client's real
export (`PHONE AND LAPTOP UPDATE AS AT JULY 14TH 2026.xlsx`, checked into
`packages/backend/src/database/seeds/source-data/`) via
`seed-full-inventory.ts` — see
[`DEPLOYMENT_PLAYBOOK.md` §6](DEPLOYMENT_PLAYBOOK.md#6-full-inventory-seed)
for how to run it. These exact counts were confirmed by actually running
the seed against a live PostgreSQL 16 instance, not estimated from the
sheet's stock-summary tab.

### 4.1 The source data is real-world messy — this matters for anyone extending the seeder

The workbook is genuine operational data entry, not a clean export:
status values include free text like `"CURRENTLY WITH SEYI
AKINBOLE...CHECKED"` and `"YET TO BE RETURNED TO US BY ELIJAH"` alongside
`ACTIVE`/`INACTIVE`/`STOLEN`/`FAULTY`/`MISSING`; laptop serial numbers are
embedded in the "MODEL/SERIAL NUMBER" column in at least six different
delimiter styles (`LENOVO-PF4N9WZC`, `HP:5CD7O24PRX`, `DELL LATITUDE
7480/SN:JZS64H2`, `HP ZBOOK i5 G6 (S/N:5CD0208ZQB) WITH A MOUSE`, ...).

`packages/backend/src/database/seeds/lib/inventory-xlsx-parser.ts` handles
this with a deliberately conservative, priority-ordered set of heuristics
(documented in-file) rather than a single regex — explicit `S/N:`/`SN:`
markers first, then the Lenovo `PF`-prefix pattern, then a parenthetical
alphanumeric token, then a trailing delimiter-separated token that
contains at least a digit, falling back to the full raw string only if
nothing structured matches. **Every heuristic guess is logged as a
`WARN:` line by the seed script, and every imported asset's `notes` field
records the exact raw source fields it was derived from** — nothing is
silently presented as cleaner than the source actually was. Against the
checked-in file, zero rows triggered a low-confidence fallback and zero
rows failed to parse (see the dry-run output in the Deployment Playbook).

### 4.2 Status mapping

Source status text is mapped onto `AssetStatus` in priority order (a
compound value like `"STOLEN/INACTIVE FROM FUNMILAYO..."` matches the
first applicable rule):

| Source pattern | Mapped `AssetStatus` |
|---|---|
| contains `STOLEN` | `Stolen` |
| contains `MISSING` | `Unaccounted` |
| contains `FAULTY` | `UnderRepair` |
| contains `CURRENTLY WITH` or `YET TO BE RETURNED` | `Allocated` |
| contains `INACTIVE` | `Available` |
| contains `ACTIVE`, with a distinct personal holder | `Allocated` |
| contains `ACTIVE`, no personal holder (pooled/warehouse) | `Available` |
| unrecognized | `Unaccounted` (flagged low-confidence) |

---

## 5. Immutable Audit History (asset_status_history)

Every status change appends a row to `asset_status_history`
(`from_status`, `to_status`, `changed_by_user_id`, `reason`,
`occurred_at`) — this table is **insert-only by design**:
`TypeOrmAssetRepository.appendStatusHistory()` calls `historyRepo.insert()`,
never an upsert, and the original migration comment
(`AddAssetInventory1720300000000`) states this explicitly: "asset_status_history
is append-only (guarded at the repository)." It's meant to be a permanent,
tamper-evident audit trail — an asset's full custody/condition history
should never be editable after the fact, only added to.

**This is a real design constraint that already caused, and forced a fix
for, a genuine bug** while building the inventory seed script: the
`assets` table upserts cleanly (`saveMany` → `repo.upsert(rows, ['id'])`),
so a first implementation of the seed script assumed idempotency would
follow the same pattern — re-running it would just upsert the same rows.
It didn't. On a second run, the very first `appendStatusHistory` call for
an already-seeded asset threw a Postgres primary-key violation, because
history rows for that asset already existed and inserts don't
resolve conflicts the way upserts do. Confirmed live against a real
PostgreSQL 16 instance, not caught by unit tests (which use an in-memory
fake that doesn't model this constraint).

**The fix, now the standing pattern for this table**: before writing
anything for a given asset id, check `findById` and skip the entire
record — both the asset row and its history rows — if it already exists.
Never attempt to reconcile or upsert history; only ever decide "write this
whole record" or "skip it entirely." Both `seed-full-inventory.ts` and
(historically) `seed-initial-inventory.ts` (retired — see `CLAUDE.md`)
follow this. Any future code that writes multiple history rows in one
operation should follow the same rule.

---

## Related documents

- [`DEPLOYMENT_PLAYBOOK.md`](DEPLOYMENT_PLAYBOOK.md) — how to actually run
  migrations and the inventory seed described in §4-§5 here.
- [`22-sapphire-virtual-source-data.md`](22-sapphire-virtual-source-data.md) —
  the client-supplied source material (hardware spec matrix, SOPs,
  assessment form, inventory stock summary) that §2-§4 of this document are
  built from.
- [`02-gaps-and-ambiguities.md`](02-gaps-and-ambiguities.md) — `GAP-01` and
  `GAP-19`, the open questions that `22-sapphire-virtual-source-data.md`
  and this document's §4 partially/fully resolved.
- [`../CLAUDE.md`](../CLAUDE.md) — conventions to preserve when extending
  any of the above; kept continuously up to date, unlike this snapshot.
- [`09-architecture.md`](09-architecture.md) — the original pre-implementation
  design document for everything not covered above (bounded contexts,
  workflow engine, RBAC, etc.).
