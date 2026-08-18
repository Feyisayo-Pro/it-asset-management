# Software Requirements Specification (SRS)
## IT Asset Lifecycle Management & Workflow Platform

Version 0.1 (Draft — Phase 1 output, pending stakeholder sign-off on
`02-gaps-and-ambiguities.md`)

---

## 1. Introduction

### 1.1 Purpose
Defines the functional and non-functional requirements for the platform
described in `PROJECT_PROMPT.md`. This document is the contract between
business stakeholders (IT, People & Culture, Stores) and the engineering
team for what is to be built.

### 1.2 Scope
A web application covering the full hardware asset lifecycle — acquisition
through disposal — with role-based workflows for allocation, return, repair,
assessment, and disposal, backed by an audit trail, compliance/SLA
monitoring, notifications, reporting, and search. Out of scope for this
version (candidates for later phases): native mobile apps, HRIS/SSO
integration, software license management, non-hardware asset types.

### 1.3 References
- `PROJECT_PROMPT.md` (source specification)
- `01-business-requirements.md` (BR-xxx traceability)
- `02-gaps-and-ambiguities.md` (GAP-xx open questions)
- `03-workflow-improvements.md` (WF-xx recommendations)
- `04-risks-and-edge-cases.md` (R-xx, E-xx)
- Source forms (not yet supplied — GAP-01): Asset Allocation & Return Form,
  Device Assessment Form, IT Specification for Asset Issuance, SOP Laptop
  Issuance

### 1.4 Definitions
- **Asset** — a physical hardware item tracked by the system.
- **Workflow** — a configured sequence of states/transitions governing an
  allocation, return, repair, or disposal.
- **State machine** — the engine executing workflow definitions.
- **RBAC** — Role-Based Access Control.
- **SLA** — Service Level Agreement (target time to complete a stage).

---

## 2. Overall Description

### 2.1 Product Perspective
Greenfield internal web application. No existing system is being replaced
in-place (source is paper + spreadsheets), so there is no legacy API/schema
to interoperate with, only legacy *data* to migrate (WF-11).

### 2.2 Product Functions (summary — see §3 for detail)
Authentication & RBAC · Dashboard & analytics · Asset inventory registry ·
Employee registry · Acquisition · Allocation workflow · Return workflow ·
Device assessment · Repair tracking · Disposal · Configurable workflow
engine · Notifications · Compliance/SLA monitoring · Immutable audit log ·
Reporting & export · Global search.

### 2.3 User Classes
| Role | Summary | Detail |
|---|---|---|
| Super Admin | Full system access, workflow configuration, user management | §3.1 |
| Stores Officer | Physical inventory custodian | §3.3 |
| IT Representative | Technical assessor, repair recommender | §3.8 |
| People & Culture (P&C) | Workflow initiator/approver, employee record owner | §3.4/3.7 |
| Employee | End user, requester, signer | §3.6 |

### 2.4 Operating Environment
Web application, desktop and tablet-responsive, targeting evergreen
browsers. Backend is an internal service accessible over the corporate
network (public internet exposure to be decided per deployment — not
specified in the prompt).

### 2.5 Assumptions Made (pending stakeholder confirmation — see GAP-xx)
- A1. One company, one currency, single legal entity (GAP-14) — revisit if
  multi-entity/multi-currency is confirmed needed.
- A2. Authentication is fully local (JWT/password) with no SSO/HRIS
  integration in V1 (GAP-16, GAP-17); status changes are entered manually by
  P&C.
- A3. "Signature" (GAP-03) is implemented as: typed full name + explicit
  consent statement + server timestamp + IP address + immutable log entry —
  not a drawn or uploaded image, and not third-party e-signature — for V1.
  Revisit if legal review requires stronger proof.
- A4. SLA thresholds (GAP-02) default to configurable-per-stage values set
  by Super Admin at deployment; no hardcoded defaults are assumed correct
  for the business.
- A5. Accessories are modeled as structured child records of an asset
  (WF-5), not free text, since the Return workflow requires item-level
  Missing Items tracking.
- A6. Vendor is shared master data (WF-7) reused by Acquisition, Repair, and
  Disposal.
- A7. Disposal requires a single Super-Admin-tier approval in V1 (GAP-08);
  maker-checker dual approval is a Phase 2+ candidate if confirmed required.

### 2.6 Constraints
- Immutable audit logging is a hard requirement (BR-13.3) — architecture
  must guarantee append-only history independent of application-level
  bugs/privilege.
- Disposed assets must never be deleted (BR-12.3).
- Workflow logic must be data-driven/configurable, not hardcoded per the
  prompt's architecture directive.

---

## 3. Functional Requirements

Numbering: `FR-<module>-<seq>`. "Shall" = mandatory for V1.

### 3.1 Authentication & RBAC (AUTH)
- FR-AUTH-01: The system shall authenticate users via email + password
  issuing a JWT access token and a refresh token.
- FR-AUTH-02: Passwords shall be stored using a salted one-way hash
  (e.g., bcrypt/argon2 class algorithm — algorithm choice is a Phase 2
  decision).
- FR-AUTH-03: The system shall support logout that invalidates the refresh
  token.
- FR-AUTH-04: Every user shall be assigned exactly one role from: Super
  Admin, Stores Officer, IT Representative, P&C, Employee.
- FR-AUTH-05: Every API endpoint shall enforce role-based authorization
  server-side, independent of client-side UI restrictions.
- FR-AUTH-06: The system shall lock or throttle an account after repeated
  failed login attempts (exact threshold: Phase 2 NFR decision).

### 3.2 Dashboard (DASH)
- FR-DASH-01: The system shall display live counts of assets by status:
  Total, Available, Allocated, Under Repair, Returned, Disposed, Lost,
  Stolen, Unaccounted.
- FR-DASH-02: The system shall display a recent activity feed of the latest
  N audit events relevant to the current user's role.
- FR-DASH-03: The system shall display pending-item queues: pending
  approvals, pending assessments, pending returns, pending requests —
  scoped to items actionable by the current user's role.
- FR-DASH-04: The system shall render charts: Assets by Department, Assets
  by Status, Assets by Brand, Assets by Type, Monthly Allocations, Monthly
  Returns.
- FR-DASH-05: Dashboard data shall respect RBAC (e.g., a Stores Officer does
  not see P&C-only escalation data).

### 3.3 Inventory (INV)
- FR-INV-01: The system shall allow Stores Officers and Super Admins to
  register a new asset with: Asset Tag (unique), Barcode/QR value, Device
  Type, Brand, Model, Serial Number (unique), IMEI (conditional on Device
  Type), Purchase Date, Purchase Amount + Currency, Vendor (reference),
  Warranty Expiry, Office Location, Department, Status.
- FR-INV-02: The system shall auto-generate a scannable barcode/QR code per
  asset if not supplied.
- FR-INV-03: The system shall enforce uniqueness on Asset Tag and Serial
  Number.
- FR-INV-04: The system shall track Current Holder as either an Employee
  reference or a Department/Location pool reference (E-7).
- FR-INV-05: The system shall support structured accessory/kit child
  records per asset with independent Present/Missing/Damaged state (WF-5).
- FR-INV-06: The system shall record free-text Notes on an asset.
- FR-INV-07: The system shall enforce the asset status enum: Available,
  Reserved, Allocated, Returned, Under Repair, Disposed, Lost, Stolen,
  Unaccounted, and only allow transitions permitted by the workflow engine
  (§3.11).
- FR-INV-08: A Reserved asset shall carry an expiry timestamp; the system
  shall auto-release it to Available on expiry (WF-6).

### 3.4 Employees (EMP)
- FR-EMP-01: The system shall store per employee: Employee ID, Name, Email,
  Department, Designation, Manager (self-reference), Office, Employment
  Status.
- FR-EMP-02: The system shall derive Assigned Assets and Asset History from
  asset/workflow records rather than duplicating them as separate manually
  maintained fields.
- FR-EMP-03: P&C and Super Admin shall be able to update Employment Status.
- FR-EMP-04: When Employment Status changes to Resigned/Terminated, the
  system shall auto-draft a Return workflow for each currently-held asset,
  routed to P&C for confirmation (WF-4).

### 3.5 Acquisition (ACQ)
- FR-ACQ-01: The system shall allow recording an acquisition capturing:
  Purchase Date, Vendor (reference), Purchase Amount + Currency, Invoice
  Number, Facilitated By (user reference), Asset Details, Condition,
  Warranty terms, generated Asset Tag.
- FR-ACQ-02: Completing an acquisition shall create the asset in
  Registration status, transitioning to Available once registration
  data is complete.

### 3.6 Allocation Workflow (ALLOC)
- FR-ALLOC-01: An Employee shall be able to submit a request of type: New
  Device, Repair, Replacement, Additional Device, Accessory.
- FR-ALLOC-02: The system shall route a New Device / Additional Device /
  Replacement request through the sequence: Employee Request → P&C Review →
  Stores Select Asset → IT Assessment → Employee Signature → P&C Signature →
  IT Signature → Inventory Update.
- FR-ALLOC-03: The system shall reject any attempt to advance a workflow
  instance to a non-adjacent state (no stage skipping) unless invoked via
  the Expedited Allocation exception path (FR-ALLOC-06).
- FR-ALLOC-04: Each stage transition shall require the acting user to hold
  the role configured for that stage.
- FR-ALLOC-05: Completing IT Signature shall update the asset's Status to
  Allocated and Current Holder to the requesting employee.
- FR-ALLOC-06 (WF-1): A Super Admin (or configured escalation role) shall be
  able to force-advance a workflow instance, provided a reason is recorded
  and the instance is flagged `bypassed = true`, visible on Compliance
  reporting.
- FR-ALLOC-07: The system shall prevent a new allocation request against an
  asset that is not in Available status.

### 3.7 Return Workflow (RET)
- FR-RET-01: A return may be initiated for reason: Resignation,
  Termination, Transfer, Replacement, Repair, Lost, Other.
- FR-RET-02: A return shall record, per accessory/kit item, Returned or
  Missing, plus overall Damage Notes and optional Photos.
- FR-RET-03: A return shall require Employee signature at minimum; P&C
  and/or IT signature requirements are configurable per return reason
  (GAP-05 — default: Employee + P&C required, IT required only if a
  physical inspection is triggered).
- FR-RET-04: Completing a return shall update asset Status to Returned and
  clear Current Holder, unless the return reason is Lost or Stolen, in
  which case Status transitions directly to Lost/Stolen (E-3) with an
  incident reference field.
- FR-RET-05: The system shall support initiating a return when the
  physical asset is not currently in the employee's possession (e.g., out
  for repair) (E-1), without blocking workflow completion on physical
  hand-back.

### 3.8 Device Assessment (ASSESS)
- FR-ASSESS-01: An IT Representative shall complete a checklist covering:
  Screen, Keyboard, Battery, Charger, Mouse, Bag, Webcam, Microphone,
  Speakers, USB Ports, HDMI, WiFi, Bluetooth, Storage, RAM, OS, Antivirus,
  Encryption, Asset Sticker, Water Damage, Physical Damage, Missing
  Components, Boots Successfully — each recorded Pass/Fail/N/A.
- FR-ASSESS-02: The assessment shall conclude with one outcome: Pass,
  Repair Recommended, Replacement Recommended, Reject.
- FR-ASSESS-03: A Reject outcome shall require the assessor to select a
  follow-on action: Send to Repair or Send to Disposal (WF-8).
- FR-ASSESS-04: The system shall capture free-text technician notes and the
  assessor's signature.

### 3.9 Repair (REPAIR)
- FR-REPAIR-01: The system shall track, per repair: Fault description,
  Technician, Repair Status, Cost, Vendor (reference), Completion Date.
- FR-REPAIR-02: The system shall capture whether the asset was in-warranty
  at the time of repair (E-9).
- FR-REPAIR-03: Completing a repair shall transition the asset back to
  Available or Allocated depending on whether it had a prior holder.

### 3.10 Disposal (DISP)
- FR-DISP-01: Only Super Admin (and any role explicitly granted the
  Disposal permission) shall be able to approve disposal.
- FR-DISP-02: A disposal record shall capture Reason, Approver, Signature,
  Date, and Evidence (file attachment).
- FR-DISP-03: Disposal shall never hard-delete the asset record; it sets
  Status to Disposed.
- FR-DISP-04: The system shall support a `Disposed → Recovered` correction
  transition, Super Admin only, with mandatory reason (E-4).

### 3.11 Workflow Engine (WF-ENGINE)
- FR-WFENG-01: The system shall define workflows as data (states, allowed
  transitions, required role per transition, validation rules,
  notification triggers) rather than hardcoded control flow.
- FR-WFENG-02: The engine shall support parallel (AND-join) stages within a
  single workflow definition (WF-2), in addition to strictly serial chains.
- FR-WFENG-03: Every transition shall be persisted with: workflow instance
  ID, previous state, next state, acting user, timestamp, reason
  (nullable unless the transition type requires one, e.g., bypass or
  rejection).
- FR-WFENG-04: The engine shall support a per-stage configurable SLA
  duration and emit an escalation event when exceeded (WF-3).

### 3.12 Notifications (NOTIF)
- FR-NOTIF-01: The system shall send email notifications to the relevant
  role(s) (Employee, IT, Stores, P&C) on events: Allocation, Assessment,
  Return, Repair, Disposal, Escalation.
- FR-NOTIF-02: Notifications requiring action from the recipient shall be
  sent immediately; passive/FYI notifications shall be eligible for
  digesting per user preference (WF-10).

### 3.13 Compliance (COMP)
- FR-COMP-01: The system shall identify SLA breaches: pending approvals,
  delayed returns, delayed store processing, outstanding signatures, based
  on configured per-stage SLA durations.
- FR-COMP-02: The system shall generate escalation reports and email the
  relevant manager automatically.
- FR-COMP-03: The system shall surface all `bypassed = true` (expedited)
  workflow instances on the Compliance view.

### 3.14 Audit Log (AUDIT)
- FR-AUDIT-01: The system shall log every state-changing action, including
  at minimum: Login, Logout, Asset Created/Updated, all workflow
  transitions, Allocation/Return/Disposal completions.
- FR-AUDIT-02: Each entry shall capture User, Action, Timestamp, Old Value,
  New Value, IP Address.
- FR-AUDIT-03: Audit log entries shall be append-only; no API or UI path
  shall permit update or delete of an existing entry.

### 3.15 Reports (REPORT)
- FR-REPORT-01: The system shall generate reports: Inventory, Allocation,
  Return, Repairs, Disposal, Department, Employee Asset History,
  Compliance.
- FR-REPORT-02: Reports shall be exportable as PDF, Excel, and CSV.
- FR-REPORT-03: Report access shall be scoped by role (e.g., Compliance
  reports containing escalation/manager data restricted to P&C/Super
  Admin — GAP-20).

### 3.16 Search (SEARCH)
- FR-SEARCH-01: The system shall provide a global search resolving by Asset
  Tag, Employee name/ID, Serial Number, IMEI, Department.
- FR-SEARCH-02: Search results shall be filtered to what the requesting
  user's role is authorized to view.

---

## 4. Non-Functional Requirements

### 4.1 Security
- NFR-SEC-01: JWT access tokens + refresh token rotation.
- NFR-SEC-02: Passwords hashed with a modern adaptive hash function.
- NFR-SEC-03: All input validated/sanitized server-side; parameterized
  queries only (SQL injection protection).
- NFR-SEC-04: CSRF protection on state-changing requests; XSS protection via
  output encoding/CSP.
- NFR-SEC-05: Audit log storage shall be architecturally protected against
  in-place modification (e.g., append-only table/store, or hash-chained
  records) — addresses R-8.
- NFR-SEC-06: File uploads (evidence photos, disposal evidence) shall be
  validated by type/size and stored outside the web root or in isolated
  object storage.

### 4.2 Performance
- NFR-PERF-01: Dashboard summary views shall load in under 2 seconds at
  expected data volumes (baseline volume to be confirmed — GAP, needs
  current fleet size).
- NFR-PERF-02: Reporting/export queries shall not degrade transactional
  workflow response times (addresses R-11) — implies read-replica or
  reporting-optimized queries at scale.

### 4.3 Availability & Reliability
- NFR-AVAIL-01: The workflow engine shall guarantee no lost transitions —
  a transition is either fully committed (including its audit entry) or not
  applied at all (transactional integrity).

### 4.4 Usability
- NFR-USE-01: UI shall follow enterprise application conventions (sidebar
  navigation, data tables with filters, activity timeline, status badges) as
  referenced against Jira/ServiceNow/Odoo/Monday/Freshservice.
- NFR-USE-02: The application shall be responsive across desktop and
  tablet breakpoints at minimum.

### 4.5 Auditability & Compliance
- NFR-AUDIT-01: Every record mutation must be traceable to a user, time,
  and reason where applicable — no anonymous or unattributed writes.

### 4.6 Maintainability
- NFR-MAINT-01: Business/workflow rules shall live in configuration/data,
  not scattered conditional code, so a workflow change doesn't require a
  code deployment (BR-2.3).

---

## 5. Data Requirements (high-level — full ERD is a Phase 2 deliverable)

Core entities implied by this SRS: `User`, `Role`, `Employee`, `Asset`,
`AssetAccessory`, `Department`, `Office`, `Vendor`, `Acquisition`,
`WorkflowDefinition`, `WorkflowInstance`, `WorkflowTransition`,
`AllocationRequest`, `ReturnRecord`, `AssessmentRecord`,
`AssessmentChecklistItem`, `RepairRecord`, `DisposalRecord`, `AuditLogEntry`,
`Notification`, `SLADefinition`, `ComplianceBreach`.

Detailed column lists, keys, indexes, and the ER diagram belong to the
Phase 2 Architecture deliverable, once GAP-01 through GAP-15 are resolved
or explicitly assumed (§2.5).

## 6. External Interface Requirements

- REST API surfaces for: Auth, Users, Employees, Assets, Assessments,
  Allocation, Returns, Repairs, Disposal, Reports, Notifications
  (detailed request/response contracts: Phase 2 deliverable).
- Outbound email service integration for all NOTIF/COMP events.
- File storage integration for evidence photos and disposal evidence
  attachments.

## 7. Traceability

Every FR-xxx above traces to one or more BR-xxx in
`01-business-requirements.md`; every assumption in §2.5 traces to a GAP-xx
in `02-gaps-and-ambiguities.md`. Maintain this mapping as GAPs are resolved
so resolved answers can be diffed against the assumptions actually built.
