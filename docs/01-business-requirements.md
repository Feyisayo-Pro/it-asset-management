# Business Requirements — Extracted from PROJECT_PROMPT.md

This document extracts and organizes the business requirements implied by the
project prompt into a traceable list (`BR-xxx`). It is the foundation for the
SRS and PRD.

> **Important caveat**: The prompt names four source documents as the
> authority for fields and workflow ("Asset Allocation & Return Form",
> "Device Assessment Form", "IT Specification for Asset Issuance", "SOP
> Laptop Issuance") but their content was **not provided**. Everything below
> is extracted from the prompt's own summaries of those forms. See
> `02-gaps-and-ambiguities.md` (GAP-01) — the actual forms must be reviewed
> before field lists are considered final.

## BR-1 — Digitization & System of Record

- BR-1.1 Every paper form currently in use (allocation, return, assessment,
  issuance spec, SOP checklist) must have a digital equivalent captured
  in-app, not as an uploaded scanned PDF.
- BR-1.2 The platform is the single source of truth for asset data — no
  parallel spreadsheet may remain authoritative after go-live.
- BR-1.3 Historical data currently in spreadsheets must be able to enter the
  system (implied by "replace spreadsheet tracking" — see GAP-25 on
  migration tooling, which is not explicit but necessary).

## BR-2 — Workflow Enforcement

- BR-2.1 Asset allocation must follow a fixed, ordered, multi-party approval
  sequence: Employee Request → P&C Review → Stores Select Asset → IT
  Assessment → Employee Signature → P&C Signature → IT Signature → Inventory
  Update.
- BR-2.2 No stage in a defined workflow may be skipped or reordered.
- BR-2.3 Workflow rules (states, transitions, required role, validation,
  notifications) must be configurable rather than hardcoded, implying an
  admin-managed workflow definition, not just code-level logic.
- BR-2.4 Every state transition must be recorded with previous state, next
  state, acting user, timestamp, and reason.

## BR-3 — Role-Based Access & Accountability

- BR-3.1 Five roles exist with distinct capabilities: Super Admin, Stores
  Officer, IT Representative, People & Culture (P&C), Employee.
- BR-3.2 Users must only see actions/screens relevant to their role
  (UI-level enforcement).
- BR-3.3 Every API endpoint must independently enforce authorization
  (server-side enforcement, not just UI hiding).
- BR-3.4 Signatures are role-bound: Employee, P&C, and IT each sign at
  distinct points; a signature must be attributable to the specific signing
  user, not just their role.

## BR-4 — Asset Lifecycle Management

- BR-4.1 Assets move through a defined 9-stage lifecycle: Acquisition →
  Registration → Available → Allocation → In Use → Repair/Maintenance →
  Returned → Reallocation → Disposal.
- BR-4.2 An asset also carries a `status` orthogonal to lifecycle stage:
  Available, Reserved, Allocated, Returned, Under Repair, Disposed, Lost,
  Stolen, Unaccounted.
- BR-4.3 Disposed assets are never hard-deleted from the system.
- BR-4.4 Every lifecycle/status transition is recorded for audit purposes.

## BR-5 — Inventory Data Capture

- BR-5.1 Each asset record stores: Asset Tag, Barcode/QR Code, Device Type,
  Brand, Model, Serial Number, IMEI, Purchase Date, Purchase Amount, Vendor,
  Warranty Expiry, Office Location, Department, Current Holder, Status,
  Accessories, Notes.
- BR-5.2 Assets must be identifiable and scannable via barcode/QR in
  physical handling (Stores workflows).

## BR-6 — Employee Data & History

- BR-6.1 Each employee record stores: Employee ID, Name, Email, Department,
  Designation, Manager, Office, Employment Status, Assigned Assets, Asset
  History.
- BR-6.2 P&C must be able to view full employee asset history at any time.

## BR-7 — Acquisition

- BR-7.1 Acquiring an asset captures Purchase Date, Vendor, Purchase Amount,
  Invoice Number, Facilitated By, Asset Details, Condition, Warranty, and
  assigns an Asset Tag.
- BR-7.2 Acquisition is the entry point that feeds Registration → Available
  states in inventory.

## BR-8 — Allocation Requests

- BR-8.1 Employees can initiate five request types: New Device, Repair,
  Replacement, Additional Device, Accessory.
- BR-8.2 Each request type must ultimately be resolved through the
  applicable workflow (allocation, repair, or return-then-allocate).

## BR-9 — Device Assessment

- BR-9.1 IT performs a structured checklist assessment covering 23 named
  checkpoints (Screen, Keyboard, Battery, Charger, Mouse, Bag, Webcam,
  Microphone, Speakers, USB Ports, HDMI, WiFi, Bluetooth, Storage, RAM, OS,
  Antivirus, Encryption, Asset Sticker, Water Damage, Physical Damage,
  Missing Components, Boots Successfully).
- BR-9.2 Each assessment concludes with one of: Pass, Repair Recommended,
  Replacement Recommended, Reject.
- BR-9.3 IT records free-text technician notes and signs the assessment.

## BR-10 — Return Workflow

- BR-10.1 Returns are initiated for one of seven reasons: Resignation,
  Termination, Transfer, Replacement, Repair, Lost, Other.
- BR-10.2 A return captures Returned Items, Missing Items, Damage Notes,
  optional Photos, and required Signatures.
- BR-10.3 Inventory status updates automatically once a return is completed.

## BR-11 — Repair Workflow

- BR-11.1 Repairs track Fault, Technician, Repair Status, Cost, Vendor,
  Completion Date.

## BR-12 — Disposal

- BR-12.1 Disposal is restricted to authorized users only.
- BR-12.2 Disposal records Reason, Approval, Signature, Date, Evidence.
- BR-12.3 Disposed assets are retained in the system permanently (soft
  state, not deletion).

## BR-13 — Audit Logging

- BR-13.1 Every state-changing action is logged: Login, Logout, Asset
  Created, Asset Updated, Allocation Approved, Return Completed, Disposal
  Approved (list is illustrative, not exhaustive).
- BR-13.2 Each log entry captures User, Action, Timestamp, Old Value, New
  Value, IP Address.
- BR-13.3 Audit logs must be immutable.

## BR-14 — Compliance & SLA

- BR-14.1 The system tracks SLA breaches: pending approvals, delayed
  returns, delayed store processing, outstanding signatures.
- BR-14.2 Escalation reports are generated and emailed to managers
  automatically.

## BR-15 — Notifications

- BR-15.1 Email notifications go to Employee, IT, Stores, and P&C for
  events: Allocation, Assessment, Return, Repair, Disposal, Escalation.

## BR-16 — Reporting

- BR-16.1 Reports must be produced for: Inventory, Allocation, Return,
  Repairs, Disposal, Department, Employee Asset History, Compliance.
- BR-16.2 Reports export to PDF, Excel, and CSV.

## BR-17 — Search

- BR-17.1 Global search must resolve by Asset Tag, Employee, Serial Number,
  IMEI, or Department.

## BR-18 — Dashboard / Visibility

- BR-18.1 Dashboard shows live counts: Total, Available, Allocated, Under
  Repair, Returned, Disposed, Lost, Stolen, Unaccounted.
- BR-18.2 Dashboard shows a recent activity feed and pending-item queues
  (approvals, assessments, returns, requests).
- BR-18.3 Dashboard shows charts: by Department, by Status, by Brand, by
  Type, Monthly Allocations, Monthly Returns.

## BR-19 — Security & Compliance Posture

- BR-19.1 JWT-based authentication with refresh tokens, hashed passwords,
  authorization middleware, input validation, and protection against
  CSRF/XSS/SQL injection.
