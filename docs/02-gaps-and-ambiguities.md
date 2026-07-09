# Gaps, Ambiguities & Open Questions

Every item below needs a stakeholder decision before (or during) the phase
noted. Numbered `GAP-xx` for traceability from the SRS/PRD "Open Questions"
sections. Severity: **Blocker** (cannot design schema/workflow correctly
without an answer), **High** (will cause rework if assumed wrong), **Medium**
(safe to assume and revisit).

## Critical Blockers

- **GAP-01 (Blocker)** — The four source documents (Asset Allocation &
  Return Form, Device Assessment Form, IT Specification for Asset Issuance,
  SOP Laptop Issuance) are referenced but their actual content was never
  supplied — only the prompt author's summary of them. Field lists,
  checklist items, and the allocation signature order in this deliverable
  are taken from that summary. **Action**: obtain the real documents and
  diff them against `01-business-requirements.md` before Phase 2 (schema)
  is finalized. Any field or rule found in the real forms but missing here
  must be added.

- **GAP-02 (Blocker)** — No numeric SLA thresholds are defined anywhere
  (e.g., "delayed return" — after how many days?). Compliance module cannot
  be built without agreed thresholds per workflow stage and per request
  type.

- **GAP-03 (Blocker)** — "Signature" is undefined as a technical concept.
  Is it: (a) a typed full-name + explicit consent checkbox + timestamp/IP,
  (b) an uploaded image of a wet signature, (c) a drawn signature-pad
  capture, or (d) integration with a third-party e-signature provider? This
  affects the data model, the audit story, and whether the result is legally
  defensible (e-signature law varies by jurisdiction — company location is
  unknown).

## Workflow Ambiguities

- **GAP-04 (High)** — The allocation workflow is strictly serial with "no
  stage may be skipped," but no exception path exists for time-critical
  cases (e.g., new hire starting day one with no laptop available). Without
  an authorized override, staff will bypass the system entirely, undermining
  BR-1.2 (single source of truth).

- **GAP-05 (High)** — The return workflow lists required signatures but,
  unlike allocation, does not specify signer order or which roles must sign
  (Employee only? Employee + P&C? + IT if device fails assessment on
  return?).

- **GAP-06 (High)** — Reject outcome in Device Assessment has no defined
  next state. Does a Rejected asset go to Under Repair, Disposal, or back to
  Available pending a second opinion? The lifecycle diagram doesn't show a
  "Reject" branch.

- **GAP-07 (High)** — "Reallocation" appears in the lifecycle as a step
  after "Returned," implying every re-assignment requires a full return
  first. Is a direct internal transfer between employees (no return in
  between, e.g., manager reassigns a spare laptop) supported, or must it
  always go Returned → Available → Allocation?

- **GAP-08 (Medium)** — Disposal approval chain is "authorized users" only.
  Who specifically — Super Admin only, or can Stores/Finance approve above a
  cost threshold? Is there a required minimum number of approvers (maker-
  checker) given disposal is irreversible in practice (assets leave company
  custody)?

- **GAP-09 (Medium)** — No maximum-devices-per-employee or per-role policy
  is defined, so "Additional Device" requests have no approval guardrail
  (e.g., can any employee request unlimited additional laptops?).

- **GAP-10 (Medium)** — Asset "Reserved" status has no defined trigger,
  owner, or expiry. Without an expiry, reserved assets could sit
  indefinitely, understating true availability on the dashboard.

## Data Model Ambiguities

- **GAP-11 (High)** — "Current Holder" on an asset assumes exactly one
  employee per asset at a time. Shared/pool assets (meeting-room devices,
  loaner pool, department-owned printers) don't map to an individual holder
  — needs a "held by department/location" option.

- **GAP-12 (Medium)** — "Accessories" is listed as a single inventory field
  with no structure. Should accessories (bag, charger, mouse, dock) be
  tracked as their own serialized/counted line items (so a return can flag
  "missing charger" against a specific accessory record), or remain free
  text? Given the return workflow explicitly needs "Missing Items," a
  structured accessory/kit model is strongly implied.

- **GAP-13 (Medium)** — IMEI is a mobile/cellular-device concept; it's
  meaningless for laptops/desktops/monitors. The field should be conditional
  on Device Type, not a universal column.

- **GAP-14 (Medium)** — Purchase Amount has no currency field. If the
  company operates in more than one country/office currency, this is
  required.

- **GAP-15 (Medium)** — Vendor appears in both Acquisition and Repair. Is
  Vendor a shared master-data entity (with contract/warranty terms), or two
  independent free-text fields? A shared entity is recommended (see
  `03-workflow-improvements.md`).

## Integration & Non-Functional Gaps

- **GAP-16 (High)** — No mention of HR/HRIS integration. Employment Status
  changes (resignation, termination) are a listed Return reason, but nothing
  says the system is notified automatically when HR changes that status —
  today it looks like a manual trigger, which risks assets not being
  reclaimed on offboarding.

- **GAP-17 (High)** — No mention of identity/SSO integration (e.g., Google
  Workspace, Azure AD/Entra). Given Employee, IT, P&C, and Stores all need
  accounts, decide whether auth is fully local (JWT + password, as stated)
  or federated.

- **GAP-18 (Medium)** — Data retention/privacy: employee PII plus device
  possession history is sensitive. No mention of retention period, access
  logging on employee records, or applicable privacy regulation (jurisdiction
  unknown).

- **GAP-19 (Medium)** — No mention of bulk/legacy data import from the
  existing Excel sheets, yet "replace spreadsheet tracking" is a stated
  objective — cutover requires migrating current inventory and employee data
  somehow.

- **GAP-20 (Medium)** — No mention of scheduled/recurring reports (only
  on-demand implied) or of report access control (can any role export any
  report, e.g., can a Stores Officer export Compliance reports containing
  manager escalation data?).

- **GAP-21 (Low)** — No mention of mobile/offline support for Stores
  warehouse scanning, where WiFi coverage in a storage room is often poor.

- **GAP-22 (Low)** — No password policy or MFA requirement stated beyond
  "password hashing" — worth deciding explicitly given this system holds
  asset + PII data.

Each `GAP-xx` should be closed (assumption recorded or stakeholder answer
obtained) before its dependent module enters detailed design. Where no
answer is available, this deliverable proceeds with the assumption stated in
`06-SRS.md` §2.5 (Assumptions).
