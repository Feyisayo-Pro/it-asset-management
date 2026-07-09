# Product Requirements Document (PRD)
## IT Asset Lifecycle Management & Workflow Platform

Version 0.1 (Draft — Phase 1)

## 1. Executive Summary

IT, People & Culture, and Stores currently manage the entire lifecycle of
company hardware — laptops, phones, monitors, accessories — through paper
forms and spreadsheets. This causes poor audit trails, no live inventory
visibility, inconsistent enforcement of approval steps, and no accountability
when assets go missing. This platform digitizes and enforces the existing
allocation/return/assessment/repair/disposal processes as configurable
workflows, backed by a single asset registry, with dashboards, notifications,
compliance/SLA tracking, and exportable reporting.

## 2. Problem Statement

- No single source of truth: asset state lives across paper forms and
  spreadsheets maintained independently by IT, P&C, and Stores.
- No enforced process: nothing prevents a stage of allocation/return being
  skipped informally.
- No audit trail: it's not reliably knowable who approved what, when.
- No live visibility: leadership cannot answer "how many laptops are
  available right now" without manual reconciliation.
- No accountability: lost/stolen/unaccounted assets aren't systematically
  tracked back to a point of custody.

## 3. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Eliminate parallel spreadsheets | 100% of asset records live only in-platform post go-live |
| Enforce workflow integrity | 0% of non-expedited workflow instances show a skipped/bypassed stage |
| Reduce unaccounted assets | Unaccounted-status count trends toward 0 within 2 quarters post go-live |
| Faster allocation cycle time | Reduce average Employee Request → Inventory Update time vs. paper-process baseline (baseline to be measured pre-launch) |
| Compliance visibility | 100% of SLA breaches surfaced automatically, 0 discovered only via manual audit |
| Reporting self-service | P&C/IT/Stores can generate any listed report without engineering help |

## 4. Target Users / Personas

- **Super Admin (IT Systems Owner)** — needs full configurability of
  workflows, roles, and global visibility; accountable for platform
  integrity.
- **Stores Officer** — needs fast, scan-first asset registration and
  issuance/return handling; pain today is manual spreadsheet reconciliation
  and paper handoffs.
- **IT Representative** — needs a fast structured assessment checklist and
  clear repair/replace/reject decisioning; pain today is inconsistent
  paper checklists.
- **People & Culture** — needs to initiate/approve workflows and see full
  employee asset history at a glance, especially at offboarding; pain
  today is chasing down who has what when someone leaves.
- **Employee** — needs to request devices/repairs/replacements and see
  their own assigned assets and history without emailing IT; pain today is
  no visibility into request status.

## 5. Scope

### In Scope (V1)
All 14 core modules named in the prompt: Authentication, Dashboard,
Inventory, Employees, Acquisition, Allocation Workflow, Return Workflow,
Device Assessment, Repairs, Disposal, Notifications, Compliance, Audit
Logs, Reports — plus the supporting Workflow Engine, Search, Vendor
master data, and a legacy-data import tool (see `07-modules.md`).

### Out of Scope (V1 — candidate backlog)
- HRIS/SSO integration (assumption A2, GAP-16/17)
- Native mobile app (responsive web only — GAP-21)
- Software license / SaaS subscription asset tracking (hardware only per
  prompt)
- Multi-currency (unless GAP-14 confirms it's needed at launch)
- Maker-checker dual approval on disposal (unless GAP-08 confirms it's
  required)

## 6. User Journeys

### 6.1 New Employee Device Allocation
Employee submits "New Device" request → P&C reviews and approves → Stores
selects a matching Available asset → IT assesses the device (Pass) →
Employee signs receipt → P&C signs → IT signs → asset flips to Allocated,
employee sees it under "My Assets."

### 6.2 Offboarding Return
P&C updates Employment Status to Resigned → system auto-drafts return
workflow for each held asset (WF-4) → P&C confirms/reason set to
Resignation → employee or manager returns items → Stores checks accessory
kit for completeness → any missing items flagged → asset returns to
Available (or Under Repair/Disposal if assessment finds issues).

### 6.3 In-Service Repair
Employee submits "Repair" request describing fault → routed to IT → IT
assessment produces "Repair Recommended" → asset moves to Under Repair,
vendor/technician assigned, cost tracked → on completion, asset returns to
Allocated with the same holder (if the employee kept a loaner, that's a
separate allocation) or Available.

### 6.4 Disposal
Asset assessed as beyond economical repair → authorized user reviews →
records reason/evidence/signature → asset set to Disposed, removed from
active inventory pool but retained permanently for audit/reporting.

## 7. Feature Priority (MoSCoW)

**Must have (V1 launch blockers)**
Auth/RBAC, Inventory registry, Employee registry, Acquisition, Allocation
workflow (serial, per spec), Return workflow, Device Assessment checklist,
Repair tracking, Disposal (single-approver), Audit log, Dashboard core
counts, Email notifications, Reports (all 8 listed) with PDF/Excel/CSV
export, Global search.

**Should have (near-term post-launch)**
Expedited/exception allocation path (WF-1), SLA timers + live escalation
(WF-3), Reservation expiry (WF-6), Vendor master data (WF-7), Structured
accessory/kit tracking (WF-5), Legacy data import tool (WF-11), Notification
digesting (WF-10).

**Could have (backlog)**
Parallel workflow stages (WF-2), Delegation of approval authority (WF-9),
Barcode-first mobile-optimized Stores UI (WF-12), Disposed→Recovered
correction flow (E-4), HRIS/SSO integration.

**Won't have (V1)**
Native mobile app, multi-currency, software/license asset tracking.

## 8. Assumptions

See `05-SRS.md` §2.5 — all assumptions there are product-level decisions
made in the absence of stakeholder answers to `02-gaps-and-ambiguities.md`
and must be explicitly reconfirmed before Phase 2 architecture is locked.

## 9. Dependencies

- Access to the four real source forms (GAP-01) to validate field lists
  and checklist completeness before schema design.
- An outbound transactional email service (for Notifications/Compliance).
- Stakeholder decision on SLA thresholds (GAP-02) before Compliance module
  detailed design.
- Stakeholder decision on the legal form of "signature" (GAP-03) before
  Allocation/Return schema is finalized.

## 10. Risks

See `04-risks-and-edge-cases.md` for the full register; top 3 to watch at
product level: workflow rigidity causing shadow processes (R-2), adoption
resistance to digital signatures (R-3), and data quality on legacy import
(R-1).

## 11. Release Strategy

Recommend a phased rollout by module group rather than big-bang:
1. Inventory + Employees + Auth (system of record foundation, no
   workflow yet — lets Stores start registering real assets and
   retiring the spreadsheet for *lookups* immediately).
2. Allocation + Assessment + Return workflows (the core process
   digitization).
3. Repair + Disposal + Compliance + Reports (closes the loop).
4. Should-have backlog items based on early usage feedback.

This lets the business start realizing "single source of truth" value
before every workflow is live, and surfaces real usage patterns before
committing to Should/Could-have scope.

## 12. Definition of Done (V1 / MVP)

- All Must-have features (§7) implemented and passing unit, integration,
  API, and E2E tests (per SRS NFRs).
- Legacy inventory data imported and validated (0 duplicate asset
  tags/serials).
- RBAC verified: every endpoint denies access to unauthorized roles
  (security review complete).
- Audit log verified append-only under load and adversarial testing.
- UAT sign-off from one representative of each role (Super Admin, Stores,
  IT, P&C, Employee).
