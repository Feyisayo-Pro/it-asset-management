# Module Breakdown

The prompt names 14 "Core Modules." This list keeps all 14 and adds the
cross-cutting/supporting modules needed to actually build them (workflow
engine, master data, file storage, import tooling) — these aren't optional
extras, they're what the 14 core modules are built *on top of*.

## Core Product Modules (from prompt)

1. **Authentication & Session Management** — login, JWT issuance/refresh,
   logout, password hashing, account lockout. Owns: `User` credentials.
2. **RBAC / Authorization** — role definitions, permission checks, API
   endpoint guards. Owns: `Role`, permission mappings. Consumed by every
   other module.
3. **Dashboard & Analytics** — live counts, activity feed, pending queues,
   charts. Reads from Inventory, Workflow, Audit — owns no primary data
   itself.
4. **Inventory / Asset Registry** — asset CRUD, status enum, barcode/QR
   generation, accessory/kit child records. Owns: `Asset`, `AssetAccessory`.
5. **Employees** — employee profile, employment status, manager hierarchy,
   derived assigned-assets/history views. Owns: `Employee`.
6. **Asset Acquisition** — purchase capture, links to Vendor, produces new
   Asset in Registration status. Owns: `Acquisition`.
7. **Allocation Workflow** — the 8-stage allocation process, request types.
   Owns: `AllocationRequest`, uses Workflow Engine for state management.
8. **Return Workflow** — return reasons, item-level return capture,
   inventory update trigger. Owns: `ReturnRecord`, uses Workflow Engine.
9. **Device Assessment** — 23-point checklist, outcome + follow-on action.
   Owns: `AssessmentRecord`, `AssessmentChecklistItem`.
10. **Repairs** — fault/technician/cost/vendor/completion tracking, warranty
    status at time of repair. Owns: `RepairRecord`.
11. **Disposal** — reason/approval/signature/evidence, disposed-state
    retention, recovery correction path. Owns: `DisposalRecord`.
12. **Notifications** — email dispatch on defined events, per-user digest
    preference. Owns: `Notification` (delivery record), templates.
13. **Compliance** — SLA threshold config, breach detection, escalation
    report generation and dispatch. Owns: `SLADefinition`, `ComplianceBreach`.
14. **Audit Logs** — append-only event capture across all modules. Owns:
    `AuditLogEntry`. Consumed by Dashboard, Compliance, Reports.
15. **Reports** — the 8 named report types, PDF/Excel/CSV export, role-scoped
    access. Reads from all modules — owns no primary data.

## Cross-Cutting / Supporting Modules (not explicitly named in the prompt, required to deliver the above)

16. **Workflow Engine** — the configurable state machine core (states,
    transitions, required role, validation rules, notification hooks,
    SLA timers, bypass/expedite path). This is what Allocation Workflow,
    Return Workflow, Repair, and Disposal are all *instances of* — building
    it as a shared engine (rather than one-off logic per workflow) is what
    the prompt's "avoid hardcoded workflow logic" directive requires.
17. **Global Search** — cross-entity search index/query layer over Asset,
    Employee, Serial Number, IMEI, Department.
18. **Vendor Management** — shared master data for Vendor, referenced by
    Acquisition, Repair, Disposal (WF-7). Not named explicitly in the
    prompt but implied by "Vendor" appearing in multiple modules.
19. **Master Data / System Settings** — Departments, Offices, Device Types,
    Brands, workflow definitions, SLA thresholds — the configuration data
    that keeps business rules out of code (BR-2.3).
20. **File & Evidence Storage** — handles return photos, disposal evidence,
    and any signature-adjacent attachments, with validated upload
    types/sizes (NFR-SEC-06).
21. **Data Import / Migration Tool** — bulk import of legacy Excel
    inventory/employee data with column mapping, duplicate detection, and
    dry-run validation (WF-11) — required to actually retire the
    spreadsheets the project exists to replace.

## Module Dependency Overview

```
Auth ──▶ RBAC ──▶ (all modules)

Master Data ──▶ Inventory, Vendor Management, Acquisition

Vendor Management ──▶ Acquisition, Repairs, Disposal

Workflow Engine ──▶ Allocation Workflow, Return Workflow,
                     Repair (status changes), Disposal (approval)

Inventory + Employees ──▶ Allocation / Return / Repair / Disposal
                          (all reference Asset + Employee)

All modules ──▶ Audit Logs ──▶ Compliance, Reports, Dashboard

Workflow Engine ──▶ Notifications, Compliance (SLA breach events)

Data Import Tool ──▶ Inventory, Employees (one-time/periodic bulk writes)
```
