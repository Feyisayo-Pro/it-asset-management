# Milestones

Sequenced by dependency, not calendar time (team size/velocity unknown).
Each milestone lists goal, key deliverables, and exit criteria. Maps onto
the prompt's 7-phase Implementation Plan, expanded into concrete checkpoints.

## M0 — Discovery Sign-off *(this deliverable)*
- **Goal**: Business and engineering agree on scope before any design work.
- **Deliverables**: Business requirements, gaps/ambiguities, workflow
  improvements, risks/edge cases, SRS, PRD, module list, milestones (this
  document set).
- **Exit criteria**: Stakeholders have reviewed `02-gaps-and-ambiguities.md`
  and either answered each GAP or explicitly accepted the stated assumption
  in SRS §2.5. The four real source forms (GAP-01) have been supplied and
  reconciled against `01-business-requirements.md`.

## M1 — Architecture & Data Design *(prompt Phase 2)*
- **Goal**: Lock the technical design before code starts.
- **Deliverables**: ER diagram, table/FK/index design, REST API contracts
  (request/response models) for Auth/Users/Employees/Assets/Assessments/
  Allocation/Returns/Repairs/Disposal/Reports/Notifications, folder
  structure per Clean Architecture/DDD, tech stack decision, workflow
  engine data schema (states/transitions/roles/SLA as configuration).
- **Exit criteria**: Schema and API contracts reviewed against every
  FR-xxx in the SRS with no unmapped requirement.

## M2 — Foundation
- **Goal**: Standing infrastructure every later module needs.
- **Deliverables**: Auth (login/refresh/logout), RBAC middleware, User &
  Employee CRUD, Master Data (Departments/Offices/Device Types/Brands),
  Audit Log write path (append-only, verified), CI/CD scaffold, base test
  harness (unit/integration).
- **Exit criteria**: A user of each role can log in and see only their
  permitted navigation; every write in this milestone produces an audit
  entry.

## M3 — Inventory Core
- **Goal**: Stores can register and browse real assets; spreadsheet lookup
  use case is retired first.
- **Deliverables**: Asset registry CRUD, barcode/QR generation, accessory/
  kit model, Vendor management, Acquisition flow, Global Search, Data
  Import tool (legacy migration).
- **Exit criteria**: Legacy inventory imported with 0 duplicate asset
  tags/serials; Stores Officer can register/search assets end-to-end.

## M4 — Workflow Engine + Allocation
- **Goal**: The configurable state machine exists and the allocation
  process runs on it end-to-end.
- **Deliverables**: Workflow Engine (states/transitions/roles/validation/
  SLA hooks/bypass path), Allocation Workflow wired to the engine covering
  all 5 request types, Employee self-service request screen, signature
  capture (per assumption A3).
- **Exit criteria**: A New Device request can be walked through all 8
  stages by users in the correct roles, with the bypass path exercised and
  visible in Compliance.

## M5 — Assessment + Return
- **Deliverables**: Device Assessment 23-point checklist with outcome
  routing (incl. Reject → Repair/Disposal per WF-8), Return Workflow with
  item-level accessory tracking, auto-drafted return on Employment Status
  change (WF-4), Lost/Stolen direct transition (E-3).
- **Exit criteria**: Full offboarding journey (M0 §6.2 in PRD) runs
  end-to-end with correct inventory state at each step.

## M6 — Repair + Disposal
- **Deliverables**: Repair tracking with warranty-at-time-of-repair capture,
  Disposal with evidence upload and approval, Disposed→Recovered correction
  path.
- **Exit criteria**: A disposed asset is confirmed never deletable via any
  UI/API path; recovery path re-enters inventory with full history intact.

## M7 — Compliance + Notifications
- **Deliverables**: SLA threshold configuration, breach detection, live
  escalation emails, notification digesting preference, Compliance
  dashboard view (including bypassed-workflow visibility).
- **Exit criteria**: A deliberately delayed workflow stage produces an
  escalation email to the correct manager without manual intervention.

## M8 — Dashboard + Reports
- **Deliverables**: All dashboard counts/feeds/charts, all 8 report types,
  PDF/Excel/CSV export, role-scoped report access.
- **Exit criteria**: Every report type produces correct output against
  seeded test data in all three export formats.

## M9 — Hardening
- **Goal**: Production-readiness, not new features.
- **Deliverables**: Full unit/integration/API/E2E test suites, security
  review (RBAC bypass attempts, audit-log immutability under adversarial
  test, injection/XSS/CSRF checks), performance testing of dashboard/report
  queries under realistic data volume.
- **Exit criteria**: No open critical/high security findings; performance
  NFRs (§4.2 of SRS) met at target data volume.

## M10 — UAT & Cutover
- **Deliverables**: Full legacy data migration (not just a sample), UAT
  session with one representative per role, defect fixes from UAT.
- **Exit criteria**: Sign-off from Super Admin, Stores, IT, P&C, and an
  Employee representative (per PRD Definition of Done).

## M11 — Deployment & Go-Live
- **Deliverables**: Production deployment, user training materials/
  sessions, hypercare support window, spreadsheet decommission
  communication.
- **Exit criteria**: Legacy spreadsheets formally retired; platform is the
  sole system of record.

## M12 — Post-Launch Backlog (Should/Could-have from PRD §7)
- Candidates: Expedited allocation refinements, parallel workflow stages,
  approval delegation, HRIS/SSO integration, barcode-first mobile Stores
  UI, multi-currency if confirmed needed.
- Sequencing of this milestone depends on real usage data gathered after
  M11, not on assumptions made today.
