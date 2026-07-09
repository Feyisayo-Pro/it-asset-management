# Architecture Design Document
## IT Asset Lifecycle Management & Workflow Platform

Version 0.1 — Phase 2 deliverable (pre-implementation)

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Domain-Driven Design](#3-domain-driven-design)
4. [Bounded Contexts](#4-bounded-contexts)
5. [Module Architecture](#5-module-architecture)
6. [Folder Structure](#6-folder-structure)
7. [Design Patterns](#7-design-patterns)
8. [State Machine Architecture](#8-state-machine-architecture)
9. [Workflow Engine](#9-workflow-engine)
10. [RBAC Architecture](#10-rbac-architecture)
11. [Notification Architecture](#11-notification-architecture)
12. [Audit Architecture](#12-audit-architecture)
13. [Email Architecture](#13-email-architecture)
14. [Logging Strategy](#14-logging-strategy)
15. [Data Architecture](#15-data-architecture)
16. [API Architecture](#16-api-architecture)
17. [Security Architecture](#17-security-architecture)
18. [Error Handling Strategy](#18-error-handling-strategy)

---

## 1. Overall Architecture

### 1.1 Architectural Style — Modular Monolith

The system uses a **modular monolith**: a single deployable unit organized
internally as strictly isolated domain modules communicating through
well-defined interfaces.

**Why not microservices?** This is an internal enterprise tool replacing
paper forms, not a consumer-facing system with independently scalable
hot-paths. A modular monolith gives us:

- **Transactional consistency** — Allocation requires updating the workflow
  state, the asset status, and the audit log atomically. In a distributed
  system this needs sagas or 2PC; in a monolith it's a database transaction.
  Given the prompt's hard requirement that "every transition must be
  recorded" (BR-2.4) and "no stage may be skipped" (BR-2.2), transactional
  atomicity is a correctness requirement, not an optimization.
- **Operational simplicity** — One deployment, one database, one log
  stream. The organization is moving from Excel sheets; their ops maturity
  doesn't warrant a distributed system.
- **Refactorability** — Module boundaries are enforced at the code level
  (module APIs, no cross-module database access). If a module later needs
  independent scaling (unlikely; see NFR-PERF-01), extraction to a service
  is straightforward because the interface already exists.

**Why not a traditional layered monolith?** A flat layered architecture
(controller → service → repository, all in one bag) doesn't enforce module
isolation — any service can import any other, creating a dependency tangle
that makes individual modules impossible to reason about or test in
isolation. The modular approach keeps domain logic behind module-level
public APIs and forbids direct cross-module database access.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                          │
│                     React SPA + TypeScript                         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS / REST JSON
┌─────────────────────────▼───────────────────────────────────────────┐
│                        API GATEWAY LAYER                           │
│            Express/NestJS HTTP + Auth Middleware                    │
├─────────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                             │
│   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│   │  Auth   │ │Inventory │ │Allocation│ │ Return │ │ Assess-  │  │
│   │ Module  │ │  Module  │ │  Module  │ │ Module │ │   ment   │  │
│   └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘  │
│   ┌────┴────┐ ┌────┴─────┐ ┌────┴─────┐ ┌───┴────┐ ┌────┴─────┐  │
│   │ Repair  │ │ Disposal │ │Compliance│ │ Report │ │Workflow  │  │
│   │ Module  │ │  Module  │ │  Module  │ │ Module │ │ Engine   │  │
│   └─────────┘ └──────────┘ └──────────┘ └────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    SHARED INFRASTRUCTURE                           │
│   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│   │  Audit  │ │ Notif.   │ │  Email   │ │  File  │ │  Search  │  │
│   │  Logger │ │  Service │ │  Sender  │ │Storage │ │  Index   │  │
│   └─────────┘ └──────────┘ └──────────┘ └────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                   │
│           PostgreSQL  ·  Redis  ·  S3-compatible storage           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layered Architecture Within Each Module

Every module follows four layers internally, top-to-bottom:

| Layer | Responsibility | Depends on |
|---|---|---|
| **Presentation** (Controller) | HTTP request/response, input validation, serialization | Application |
| **Application** (Use Cases) | Orchestrates domain operations, owns transaction boundaries | Domain |
| **Domain** (Entities, Value Objects, Domain Events) | Business rules, invariants, state transitions | Nothing (pure) |
| **Infrastructure** (Repositories, External Services) | Persistence, email, file storage, external APIs | Domain (implements interfaces defined in Domain) |

This is **Clean Architecture** / **Hexagonal Architecture**: the domain
layer has zero outward dependencies. Infrastructure implements domain-defined
interfaces (Repository interfaces, Event Publisher interfaces), injected at
runtime. This means the domain can be unit-tested with in-memory fakes,
without a database or email service running.

**Why?** The prompt explicitly requires Clean Architecture + Repository
Pattern + Service Layer. More importantly, the Workflow Engine and RBAC
logic are the core business rules of this system — they must be testable
in isolation from HTTP, PostgreSQL, and email delivery. The layered approach
guarantees this.

---

## 2. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| **Backend Runtime** | Node.js + TypeScript | Type safety across the stack; large ecosystem for enterprise tooling; the team's likely skillset given a JS/TS frontend |
| **Backend Framework** | NestJS | First-class support for modules, dependency injection, guards (RBAC), interceptors (audit), and decorators — all align with the architecture requirements. Its module system directly maps to our bounded contexts. |
| **ORM / Query Builder** | TypeORM or Prisma (decided at M1) | Type-safe schema, migrations, repository pattern support. TypeORM's `QueryRunner` gives explicit transaction control needed for atomic workflow transitions. |
| **Database** | PostgreSQL 16 | Relational (required by prompt), mature, supports row-level locking (R-10 race condition), partial indexes, JSONB for flexible checklist storage, and append-only patterns for audit. |
| **Cache / Session Store** | Redis | Refresh token blacklist, reservation expiry TTLs, dashboard count caching. |
| **Frontend** | React 18 + TypeScript | Component model fits the enterprise UI requirements (data tables, sidebar, filters, status badges). |
| **UI Component Library** | Ant Design or Shadcn/ui | Enterprise-grade data tables, forms, date pickers out of the box; matches the Jira/ServiceNow/Freshservice visual language cited in the prompt. |
| **State Management** | React Query (TanStack Query) | Server-state-centric (most state is fetched from the API, not local); automatic cache invalidation on mutations aligns with workflow state changes. |
| **Charts** | Recharts or Apache ECharts | Dashboard charts (§FR-DASH-04); both support all required chart types. |
| **Email** | Nodemailer + SMTP relay | Abstracted behind an interface; swappable for SendGrid/SES/Mailgun without touching business logic. |
| **File Storage** | S3-compatible (MinIO for self-hosted, AWS S3 for cloud) | Evidence photos, disposal attachments, generated report files (PDF/Excel). |
| **PDF Generation** | PDFKit or Puppeteer | Report export to PDF (FR-REPORT-02). |
| **Excel/CSV Export** | ExcelJS | Report export to XLSX/CSV (FR-REPORT-02). |
| **Barcode/QR** | `bwip-js` (server-side generation) | FR-INV-02 barcode/QR generation. |
| **Testing** | Jest (unit/integration) + Supertest (API) + Playwright (E2E) | Full pyramid per prompt §TESTING. |
| **Containerization** | Docker + Docker Compose | Reproducible dev/CI/staging/production environments. |

---

## 3. Domain-Driven Design

### 3.1 Strategic Design — Ubiquitous Language

The domain vocabulary is drawn directly from the business process the
prompt describes. These terms mean the same thing in conversation, code,
database columns, and API payloads:

| Term | Definition |
|---|---|
| **Asset** | A physical hardware item tracked through its lifecycle |
| **Asset Tag** | Unique human-readable identifier printed on the physical asset |
| **Allocation** | The workflow of assigning an Available asset to an Employee |
| **Return** | The workflow of reclaiming an asset from an Employee back to inventory |
| **Assessment** | A structured technical evaluation of an asset's condition by IT |
| **Disposition** | The terminal outcome of an assessment: Pass, Repair, Replace, Reject |
| **Workflow Instance** | A single execution of a defined workflow (e.g., one allocation request) |
| **Transition** | A state change within a workflow instance, performed by an authorized user |
| **SLA Breach** | A workflow stage that exceeded its configured maximum duration |
| **Signature** | A user's recorded consent at a workflow step (typed name + timestamp + IP) |

**Why define this?** DDD's Ubiquitous Language prevents the #1 source of
enterprise-software bugs: the same word meaning different things to
different people. "Return" in this system always means the BR-10 workflow,
never "HTTP return" or "function return" in code — naming conventions in
code follow this table.

### 3.2 Tactical Design — Building Blocks

| Building Block | How we use it |
|---|---|
| **Entity** | Objects with identity that persist across state changes: `Asset`, `Employee`, `User`, `WorkflowInstance`, `RepairRecord` |
| **Value Object** | Immutable, identity-less objects compared by value: `AssetTag`, `SerialNumber`, `Money` (amount + currency), `ChecklistResult`, `SignatureRecord` |
| **Aggregate** | Consistency boundary — all invariants within an aggregate are enforced in a single transaction. Key aggregates: `Asset` (with accessories), `WorkflowInstance` (with transitions), `AssessmentRecord` (with checklist items) |
| **Aggregate Root** | The entity that owns the aggregate: `Asset` is the root of {Asset, AssetAccessory}; `WorkflowInstance` is the root of {WorkflowInstance, WorkflowTransition} |
| **Repository** | Persistence interface defined in the domain layer, implemented in infrastructure: `AssetRepository`, `WorkflowInstanceRepository`, etc. |
| **Domain Event** | Something that happened in the domain that other modules care about: `AssetAllocated`, `ReturnCompleted`, `SLABreached`, `AssessmentCompleted` |
| **Domain Service** | Business logic that doesn't belong to a single entity: `WorkflowEngine` (evaluates transition rules across workflow definition + instance state), `SLAEvaluator` |
| **Application Service (Use Case)** | Orchestrates a user action: `AllocateAssetUseCase` loads the workflow instance, calls the engine, persists the transition, emits events — all in one transaction |

**Why Aggregates matter here specifically:** The allocation workflow
touches Asset status, WorkflowInstance state, and AuditLog in one
operation. Without aggregate boundaries, any code path could update Asset
status independently of the workflow — violating BR-2.2 ("no stage may be
skipped"). By making status changes go *through* the WorkflowInstance
aggregate (which validates the transition), we structurally prevent bypass.

---

## 4. Bounded Contexts

A bounded context is an autonomous area of the domain with its own model,
language, and data ownership. Cross-context communication uses published
interfaces (domain events or direct module API calls), never shared
database tables.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BOUNDED CONTEXTS                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   IDENTITY   │  │   ASSET      │  │     WORKFLOW             │  │
│  │              │  │   REGISTRY   │  │                          │  │
│  │ • User       │  │ • Asset      │  │ • WorkflowDefinition    │  │
│  │ • Role       │  │ • Accessory  │  │ • WorkflowInstance      │  │
│  │ • Session    │  │ • Vendor     │  │ • Transition            │  │
│  │ • Permission │  │ • Acquisition│  │ • StateMachine          │  │
│  │              │  │ • AssetTag   │  │ • SLADefinition         │  │
│  └──────┬───────┘  │ • Department │  │                          │  │
│         │          │ • Office     │  │ ◄── Allocation Workflow  │  │
│         │          └──────┬───────┘  │ ◄── Return Workflow      │  │
│         │                 │          │ ◄── Repair Workflow       │  │
│   publishes:        publishes:       │ ◄── Disposal Workflow    │  │
│   UserCreated       AssetRegistered  └──────────┬───────────────┘  │
│   UserDeactivated   AssetStatusChanged           │                  │
│         │                 │                publishes:               │
│         │                 │           TransitionCompleted           │
│         │                 │           WorkflowCompleted             │
│         │                 │           SLABreached                   │
│  ┌──────▼─────────────────▼──────────────────────▼───────────────┐  │
│  │                     PEOPLE                                    │  │
│  │ • Employee  • EmploymentStatus  • AssetAssignment (view)     │  │
│  └──────┬────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         │ publishes: EmploymentStatusChanged                       │
│         │                                                          │
│  ┌──────▼────────────────────────────────────────────────────────┐  │
│  │                CROSS-CUTTING CONTEXTS                         │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐ │  │
│  │  │  AUDIT  │  │ NOTIFICATION │  │COMPLIANCE │  │ REPORTING│ │  │
│  │  │         │  │              │  │           │  │          │ │  │
│  │  │Consumes:│  │Consumes:     │  │Consumes:  │  │Reads:    │ │  │
│  │  │All domain│  │All domain   │  │SLABreached│  │All other │ │  │
│  │  │events    │  │events       │  │Transition │  │contexts' │ │  │
│  │  │         │  │             │  │Completed  │  │data (RO) │ │  │
│  │  └─────────┘  └──────────────┘  └───────────┘  └──────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Context Map — relationships between bounded contexts

| Upstream | Downstream | Relationship | Mechanism |
|---|---|---|---|
| Identity | All others | **Conformist** — downstream accepts Identity's User/Role model as-is | Synchronous module API call |
| Asset Registry | Workflow, Reporting | **Published Language** — Asset exposes a stable read interface | Module API (queries); Domain Events for status changes |
| Workflow | Asset Registry | **Customer-Supplier** — Workflow tells Asset Registry to change status on completion | Application-layer command via module API, within a shared DB transaction |
| People | Workflow | **Customer-Supplier** — People emits `EmploymentStatusChanged`; Workflow auto-creates return drafts | Domain Event (in-process event bus) |
| All domain contexts | Audit | **Open Host** — every context publishes events; Audit subscribes to all | Domain Event subscription |
| All domain contexts | Notification | **Open Host** — same as Audit | Domain Event subscription |
| Workflow | Compliance | **Published Language** — Compliance reads workflow state + SLA config to detect breaches | Read-only query + event subscription |
| All contexts | Reporting | **Open Host** — Reporting reads from all (read-only) | Read-only repository interfaces or database views |

**Why these boundaries?**

- **Identity is separate from People (Employee)**: A `User` (login
  credentials, role, session) is not the same as an `Employee` (HR profile,
  department, manager, employment status). Not every employee has a system
  account immediately; a Super Admin might not be an "employee" at all. Merging
  them creates a model that's wrong for both security and HR concerns.

- **Workflow is separate from Asset Registry**: The workflow engine is a
  generic state machine that could run allocation, return, repair, or
  disposal. Asset Registry knows about physical inventory. The workflow
  doesn't know what an "IMEI" is; the asset doesn't know what a "pending
  P&C approval" is. Separating them means the engine is reusable and
  testable without asset data, and the asset model doesn't grow a tangle
  of workflow-specific fields.

- **Audit and Notification are downstream consumers, not embedded in each
  module**: If every module contained its own audit-writing and
  email-sending code, (a) audit format would drift across modules, (b)
  adding a new notification channel (e.g., Slack) would require touching
  every module, (c) a failed email send could block a workflow transition.
  Event-driven decoupling solves all three.

---

## 5. Module Architecture

Each bounded context maps to one or more NestJS modules. A module has:

- A **public API** (exported service class) — the only way other modules
  interact with it.
- **Internal services, entities, repositories** — not exported; invisible
  to other modules.
- Its own **database tables** — no other module reads or writes them
  directly; cross-module data access goes through the public API.

### Module List

| Module | Bounded Context | Owns Tables | Public API Surface |
|---|---|---|---|
| `AuthModule` | Identity | `users`, `refresh_tokens` | `AuthService`: register, login, refresh, logout, validateToken |
| `RbacModule` | Identity | `roles`, `permissions`, `role_permissions` | `RbacService`: checkPermission, getUserPermissions; `RbacGuard`: NestJS guard |
| `EmployeeModule` | People | `employees` | `EmployeeService`: create, update, getById, getByUserId, listByDepartment, changeEmploymentStatus |
| `AssetModule` | Asset Registry | `assets`, `asset_accessories`, `asset_status_history` | `AssetService`: register, update, getById, getByTag, search, changeStatus, listByStatus |
| `VendorModule` | Asset Registry | `vendors` | `VendorService`: create, update, getById, list |
| `MasterDataModule` | Asset Registry | `departments`, `offices`, `device_types`, `brands` | `MasterDataService`: CRUD for each reference table |
| `AcquisitionModule` | Asset Registry | `acquisitions` | `AcquisitionService`: create, getById, list |
| `WorkflowModule` | Workflow | `workflow_definitions`, `workflow_stages`, `workflow_instances`, `workflow_transitions`, `sla_definitions` | `WorkflowService`: createInstance, transition, getInstanceState, getDefinition |
| `AllocationModule` | Workflow | `allocation_requests` | `AllocationService`: submitRequest, getRequest, listPending |
| `ReturnModule` | Workflow | `return_records`, `return_items` | `ReturnService`: initiateReturn, completeReturn, getRecord |
| `AssessmentModule` | Workflow | `assessment_records`, `assessment_checklist_items` | `AssessmentService`: createAssessment, completeAssessment, getByAsset |
| `RepairModule` | Workflow | `repair_records` | `RepairService`: createRepair, updateStatus, completeRepair |
| `DisposalModule` | Workflow | `disposal_records` | `DisposalService`: requestDisposal, approveDisposal, getRecord |
| `AuditModule` | Audit | `audit_logs` | `AuditService`: log (write-only); query (read-only, for dashboard/reports) |
| `NotificationModule` | Notification | `notifications`, `notification_preferences` | `NotificationService`: (internal — triggered by events, no public write API) |
| `ComplianceModule` | Compliance | `compliance_breaches` | `ComplianceService`: evaluateBreaches, getBreaches, getEscalations |
| `ReportModule` | Reporting | (none — reads from other modules) | `ReportService`: generateReport(type, filters, format) |
| `SearchModule` | (cross-cutting) | `search_index` (or uses PG full-text) | `SearchService`: globalSearch(query) |
| `FileStorageModule` | (infrastructure) | `file_references` | `FileStorageService`: upload, getUrl, delete |

---

## 6. Folder Structure

```
it-asset-management/
├── docs/                              # This documentation
│
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts                # Application entry point
│   │   │   ├── app.module.ts          # Root NestJS module — imports all domain modules
│   │   │   │
│   │   │   ├── common/                # Shared kernel (§7.1)
│   │   │   │   ├── decorators/        # @Roles(), @CurrentUser(), @Auditable()
│   │   │   │   ├── filters/           # Global exception filters
│   │   │   │   ├── guards/            # RbacGuard, JwtAuthGuard
│   │   │   │   ├── interceptors/      # AuditInterceptor, LoggingInterceptor
│   │   │   │   ├── interfaces/        # Shared interfaces (IRepository<T>, IDomainEvent)
│   │   │   │   ├── pipes/             # Validation pipes
│   │   │   │   ├── types/             # Shared value objects (Money, DateRange)
│   │   │   │   ├── events/            # Event bus abstraction, base event class
│   │   │   │   └── utils/             # Pure utility functions
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   │   └── dto/
│   │   │   │   │   │       ├── login.dto.ts
│   │   │   │   │   │       └── register.dto.ts
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── auth.service.ts          # Use cases
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── login.command.ts
│   │   │   │   │   │       └── refresh-token.command.ts
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   └── user.entity.ts
│   │   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   │   └── hashed-password.vo.ts
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   │   └── user-logged-in.event.ts
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   │       └── user.repository.ts   # Interface only
│   │   │   │   │   └── infrastructure/
│   │   │   │   │       ├── repositories/
│   │   │   │   │       │   └── typeorm-user.repository.ts
│   │   │   │   │       └── strategies/
│   │   │   │   │           └── jwt.strategy.ts
│   │   │   │   │
│   │   │   │   ├── asset/               # Same 4-layer structure
│   │   │   │   │   ├── asset.module.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   ├── application/
│   │   │   │   │   ├── domain/
│   │   │   │   │   └── infrastructure/
│   │   │   │   │
│   │   │   │   ├── employee/            # Same structure
│   │   │   │   ├── workflow/            # Workflow Engine — the most complex module
│   │   │   │   │   ├── workflow.module.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   │   └── workflow.controller.ts
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── workflow.service.ts
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       └── transition.command.ts
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   ├── workflow-definition.entity.ts
│   │   │   │   │   │   │   ├── workflow-instance.entity.ts
│   │   │   │   │   │   │   └── workflow-transition.entity.ts
│   │   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   │   ├── workflow-state.vo.ts
│   │   │   │   │   │   │   └── transition-rule.vo.ts
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── state-machine.ts     # Core engine
│   │   │   │   │   │   │   └── sla-evaluator.ts
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   │   ├── transition-completed.event.ts
│   │   │   │   │   │   │   └── sla-breached.event.ts
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   │       ├── workflow-definition.repository.ts
│   │   │   │   │   │       └── workflow-instance.repository.ts
│   │   │   │   │   └── infrastructure/
│   │   │   │   │       └── repositories/
│   │   │   │   │
│   │   │   │   ├── allocation/          # Uses WorkflowModule
│   │   │   │   ├── return/
│   │   │   │   ├── assessment/
│   │   │   │   ├── repair/
│   │   │   │   ├── disposal/
│   │   │   │   ├── vendor/
│   │   │   │   ├── master-data/
│   │   │   │   ├── acquisition/
│   │   │   │   ├── audit/
│   │   │   │   ├── notification/
│   │   │   │   ├── compliance/
│   │   │   │   ├── report/
│   │   │   │   ├── search/
│   │   │   │   └── file-storage/
│   │   │   │
│   │   │   └── config/                  # App configuration
│   │   │       ├── database.config.ts
│   │   │       ├── jwt.config.ts
│   │   │       ├── mail.config.ts
│   │   │       └── storage.config.ts
│   │   │
│   │   ├── test/
│   │   │   ├── unit/                    # Mirrors src/modules/ structure
│   │   │   ├── integration/             # Module-level with test DB
│   │   │   ├── api/                     # Supertest against running app
│   │   │   └── e2e/                     # Playwright full-stack tests
│   │   │
│   │   ├── migrations/                  # TypeORM/Prisma migrations
│   │   ├── seeds/                       # Reference data + test data
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/                     # API client, generated or manual
│       │   │   ├── client.ts            # Axios/fetch wrapper with JWT
│       │   │   ├── auth.api.ts
│       │   │   ├── assets.api.ts
│       │   │   └── ...
│       │   ├── components/              # Shared/generic UI components
│       │   │   ├── layout/
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── Header.tsx
│       │   │   │   └── PageLayout.tsx
│       │   │   ├── data-table/
│       │   │   ├── status-badge/
│       │   │   ├── activity-timeline/
│       │   │   └── signature-pad/
│       │   ├── features/                # Feature-sliced, mirrors backend modules
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── hooks/
│       │   │   ├── dashboard/
│       │   │   │   ├── DashboardPage.tsx
│       │   │   │   ├── widgets/
│       │   │   │   └── charts/
│       │   │   ├── inventory/
│       │   │   │   ├── AssetListPage.tsx
│       │   │   │   ├── AssetDetailPage.tsx
│       │   │   │   ├── AssetForm.tsx
│       │   │   │   └── hooks/
│       │   │   ├── allocation/
│       │   │   ├── return/
│       │   │   ├── assessment/
│       │   │   ├── repair/
│       │   │   ├── disposal/
│       │   │   ├── employees/
│       │   │   ├── compliance/
│       │   │   ├── reports/
│       │   │   └── settings/            # Master data, workflow config (admin)
│       │   ├── hooks/                   # Global hooks (useAuth, usePermission)
│       │   ├── context/                 # React context (AuthContext)
│       │   ├── routes/                  # Route definitions with guards
│       │   ├── types/                   # Shared TypeScript types
│       │   └── utils/
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── Dockerfile
│
├── docker-compose.yml                   # Postgres + Redis + MinIO + app
├── .env.example
└── README.md
```

**Why this structure?**

- **`modules/<name>/` with 4 sub-layers** enforces Clean Architecture
  at the filesystem level. A developer cannot accidentally import a
  repository implementation from outside the module — ESLint/TS path
  restrictions enforce this. The domain folder has zero imports from
  infrastructure or presentation.

- **Frontend `features/` mirrors backend modules** so a developer working
  on "allocation" can find both the API contract and the UI in one
  conceptual place, reducing context-switching.

- **`common/` is the Shared Kernel** (DDD term): code that multiple
  bounded contexts depend on. It's kept deliberately thin — interfaces,
  decorators, base classes — never business logic. If something in
  `common/` contains a business rule, it belongs in a domain module.

---

## 7. Design Patterns

### 7.1 Repository Pattern

Every aggregate root has a repository *interface* defined in the domain
layer and an *implementation* in the infrastructure layer.

```
domain/repositories/asset.repository.ts     ← interface: findById, save, findByTag
infrastructure/repositories/typeorm-asset.repository.ts  ← implements with TypeORM
```

**Why?** (1) Domain logic is testable with in-memory implementations.
(2) Switching ORMs or adding a caching layer doesn't touch domain code.
(3) The prompt explicitly requires the Repository Pattern.

### 7.2 Unit of Work

A single use case (e.g., "approve allocation step") may need to update
multiple aggregates atomically: the WorkflowInstance (new transition), the
Asset (status change), and the AuditLog (new entry). The Application Service
opens a database transaction, performs all operations, and commits or rolls
back as one unit.

**Why?** The prompt requires "every transition must be recorded" (BR-2.4)
and audit entries must be consistent with actual state. Without
transactional atomicity, a crash between updating the asset and writing the
audit entry leaves the system in an inconsistent state that contradicts the
audit's guarantee. In NestJS/TypeORM this is implemented via `QueryRunner`
passed through the call chain.

### 7.3 Domain Events (Observer / Pub-Sub)

When a domain operation completes (e.g., `AssetAllocated`), the aggregate
collects domain events. After the transaction commits, the Application
Service publishes them to an in-process event bus. Subscribers (Audit
module, Notification module, Compliance module) handle them asynchronously.

```
WorkflowInstance.transition(...)
  → collects TransitionCompleted event internally
  → Application Service commits transaction
  → Application Service publishes event
  → AuditSubscriber.handle(event)  → writes audit log
  → NotificationSubscriber.handle(event)  → queues email
  → ComplianceSubscriber.handle(event)  → checks SLA
```

**Why?** (1) Decouples domain modules from cross-cutting concerns — the
Workflow module doesn't import the Notification module. (2) Adding a new
reaction (e.g., Slack notification) means adding a subscriber, not
modifying existing code (Open/Closed Principle). (3) The prompt requires
notifications on every workflow event — baking email logic into every
workflow operation would be a maintenance disaster.

**Why in-process, not a message broker?** This is a modular monolith with
one database. An in-process event bus (NestJS `EventEmitter2` or a custom
implementation) gives us reliable delivery (events are published after the
transaction commits, and subscribers run in the same process). A broker
(RabbitMQ, Kafka) adds operational complexity for no benefit at this scale.
If extraction to microservices ever happens, the event interface stays the
same — only the transport changes.

### 7.4 Strategy Pattern (Workflow Definitions)

Different workflow types (Allocation, Return, Repair, Disposal) have
different stage sequences, role requirements, and validation rules. Rather
than `if/else` chains in the engine, each workflow type is a *data-driven
strategy* — a `WorkflowDefinition` record in the database defining its
stages, transition rules, and required roles. The `StateMachine` domain
service evaluates the definition generically.

**Why?** The prompt says "avoid hardcoded workflow logic" and
"configurable state machine." This pattern is what makes those requirements
possible — a Super Admin can modify a workflow definition without a code
deployment (FR-WFENG-01, NFR-MAINT-01).

### 7.5 Specification Pattern (Validation Rules)

Workflow transitions have preconditions: "asset must be in Available status,"
"user must have P&C role," "all checklist items must be completed." These
are modeled as composable `Specification` objects that the state machine
evaluates before allowing a transition.

**Why?** Validation rules vary per stage, per workflow type, and are
admin-configurable. Hardcoding them as `if` statements in service methods
means every new rule requires a code change. Specifications are composable
(`AND`, `OR`, `NOT`), testable individually, and storable as configuration.

### 7.6 Guard Pattern (RBAC — see §10)

NestJS Guards intercept every request before it reaches the controller.
`JwtAuthGuard` verifies the token; `RbacGuard` checks the user's role
against the required permission for the endpoint. This is not a
business-logic pattern — it's an infrastructure pattern that enforces
BR-3.3 ("protect every API endpoint") at the framework level so individual
controllers can't forget to check authorization.

### 7.7 Interceptor Pattern (Audit — see §12)

NestJS Interceptors wrap the execution of every controller method. The
`AuditInterceptor` captures the before/after state of any state-changing
operation and writes an audit entry. This cross-cutting concern is applied
declaratively (via decorator or global registration), not manually coded
into each endpoint.

### 7.8 Decorator Pattern (Metadata)

Custom decorators (`@Roles('P&C', 'SuperAdmin')`, `@Auditable()`,
`@Signature()`) attach metadata to controller methods. Guards and
interceptors read this metadata to decide behavior. This keeps
authorization and audit requirements visible in the controller declaration
rather than buried in service code.

---

## 8. State Machine Architecture

### 8.1 Conceptual Model

The state machine is the enforcement mechanism for "no stage may be
skipped" (BR-2.2). It's a finite state machine (FSM) where:

- **States** are defined per workflow type as an ordered set (but not
  necessarily linear — the engine supports branching and AND-join gates).
- **Transitions** are the edges between states, each with: a required role,
  a set of validation specifications (preconditions), and a set of
  side-effect triggers (notifications, status updates).
- **The current state** of a workflow instance is the single source of truth
  for what actions are available next.

### 8.2 Data Model

```
WorkflowDefinition
├── id
├── name (e.g., "Asset Allocation", "Asset Return")
├── version (for non-breaking evolution of definitions)
├── is_active
└── stages: WorkflowStage[]
    ├── id
    ├── name (e.g., "P&C Review", "IT Assessment")
    ├── stage_order
    ├── stage_type: SEQUENTIAL | PARALLEL_START | PARALLEL_END
    ├── required_role
    ├── sla_hours (nullable)
    ├── validation_rules: JSON (serialized Specification descriptors)
    └── on_complete_actions: JSON (notification triggers, status updates)

WorkflowInstance
├── id
├── workflow_definition_id → WorkflowDefinition
├── reference_type (e.g., "allocation_request", "return_record")
├── reference_id → the domain object this workflow governs
├── current_stage_id → WorkflowStage
├── status: ACTIVE | COMPLETED | CANCELLED | SUSPENDED
├── is_bypassed: boolean
├── created_by → User
├── created_at
├── completed_at (nullable)
└── transitions: WorkflowTransition[]
    ├── id
    ├── from_stage_id → WorkflowStage (nullable for initial)
    ├── to_stage_id → WorkflowStage
    ├── performed_by → User
    ├── performed_at
    ├── reason (nullable, mandatory for bypass/rejection)
    ├── signature_data: JSON (typed name, consent, IP, timestamp)
    └── metadata: JSON (any stage-specific payload)
```

### 8.3 Transition Algorithm

```
function evaluateTransition(instance, targetStage, user, payload):
    definition = loadDefinition(instance.workflow_definition_id)

    // 1. Verify the transition is structurally allowed
    currentStage = instance.current_stage_id
    allowedNextStages = definition.getNextStages(currentStage)
    if targetStage NOT IN allowedNextStages:
        REJECT "Invalid transition: cannot go from {current} to {target}"

    // 2. Verify the user holds the required role
    requiredRole = targetStage.required_role
    if user.role != requiredRole AND NOT bypass:
        REJECT "Unauthorized: requires role {requiredRole}"

    // 3. Evaluate validation specifications
    rules = targetStage.validation_rules
    for each rule in rules:
        if NOT rule.isSatisfiedBy(context):
            REJECT "Validation failed: {rule.description}"

    // 4. Execute the transition atomically
    BEGIN TRANSACTION
        transition = createTransition(instance, currentStage, targetStage, user, payload)
        instance.current_stage_id = targetStage.id
        if targetStage is terminal:
            instance.status = COMPLETED
            instance.completed_at = now()
        save(instance)
        save(transition)

        // 5. Execute on_complete_actions (e.g., update asset status)
        for each action in targetStage.on_complete_actions:
            execute(action, context)
    COMMIT TRANSACTION

    // 6. Publish domain events (after commit)
    publish(TransitionCompleted { instance, transition })
    if instance.status == COMPLETED:
        publish(WorkflowCompleted { instance })
```

**Why this algorithm specifically?**
- Step 1 enforces "no stage skipped" structurally.
- Step 2 enforces RBAC at the workflow level, not just the HTTP level.
- Step 3 allows arbitrary business rules per stage without hardcoding.
- Step 4 is atomic — the transition, instance update, and side effects
  (like asset status change) all commit or all roll back.
- Step 6 publishes events *after* commit so subscribers see committed
  state, and a subscriber failure doesn't roll back the business
  transaction.

### 8.4 Bypass (Expedited) Path

When `bypass = true` in the transition request:
- Steps 1-2 are relaxed: only Super Admin (or configured escalation role)
  can bypass; the target stage can be non-adjacent.
- A mandatory `reason` is required in the payload.
- The transition record is flagged `is_bypassed = true`.
- The workflow instance is flagged `is_bypassed = true`.
- A `WorkflowBypassed` event is published (Compliance module subscribes).

### 8.5 Parallel (AND-Join) Stages

For WF-2 (parallel stages), the engine supports:
- A `PARALLEL_START` stage type that forks into N child stages.
- A `PARALLEL_END` (join) stage that only becomes available once all
  parallel children are completed.
- `WorkflowInstance` tracks multiple `current_stage_ids` when in a
  parallel section (or, more precisely, each parallel branch is tracked
  independently and the join stage's precondition checks all branches).

### 8.6 Asset Lifecycle State Machine (distinct from workflow)

The asset's own `status` field has its own simpler state machine, enforced
at the Asset entity level:

```
                    ┌──────────┐
                    │Registered│
                    └────┬─────┘
                         ▼
                    ┌──────────┐
          ┌────────│ Available │◄───────────────────────┐
          │        └────┬──┬───┘                        │
          │             │  │                            │
          ▼             │  ▼                            │
    ┌──────────┐        │ ┌──────────┐          ┌──────┴───┐
    │ Reserved │────────┘ │Allocated │──────────►│ Returned │
    └──────────┘          └──┬───┬───┘          └──────────┘
         (expiry →           │   │                    │
          Available)         │   │                    │
                             │   ▼                    │
                             │ ┌────────────┐         │
                             │ │Under Repair│─────────┘
                             │ └────────────┘  (repair complete →
                             │                  Returned or Available)
                             ▼
                     ┌───────────────┐
                     │ Lost / Stolen │
                     └───────────────┘
                             │
                             ▼ (investigation closes)
                     ┌──────────┐
                     │ Disposed │◄──── (from any terminal assessment)
                     └──────┬───┘
                            │ (error correction, Super Admin only)
                            ▼
                     ┌──────────┐
                     │Recovered │──► Available
                     └──────────┘
```

Transitions outside this graph are rejected by the `Asset` entity itself
before even reaching the workflow engine. This is defense-in-depth: even
if a workflow definition has a misconfigured action, the asset entity
won't accept an illegal status change.

---

## 9. Workflow Engine

### 9.1 Engine Responsibilities

The Workflow Engine is *not* a module that knows about allocations, returns,
or repairs. It is a **generic orchestrator** that:

1. Stores workflow definitions (which stages, in what order, with what
   roles and rules).
2. Creates workflow instances tied to a reference entity (an allocation
   request, a return record, etc.).
3. Evaluates whether a requested transition is legal (§8.3 algorithm).
4. Records the transition.
5. Emits domain events.
6. Tracks SLA timers.

The domain-specific modules (Allocation, Return, etc.) are **clients** of
the engine. They define their workflow as a `WorkflowDefinition`, create
instances when a request comes in, and interpret completion events to
perform domain-specific actions (like updating asset status).

### 9.2 Separation of Generic vs. Domain-Specific

```
┌────────────────────────┐      ┌─────────────────────────────┐
│   WorkflowModule       │      │   AllocationModule          │
│   (generic engine)     │      │   (domain-specific)         │
│                        │      │                             │
│ • WorkflowDefinition   │◄─────│ • Creates WF definition     │
│ • WorkflowInstance     │      │   at seed/config time       │
│ • StateMachine         │      │                             │
│ • SLAEvaluator         │◄─────│ • Calls engine.transition() │
│                        │      │   from AllocationService    │
│ • Emits:               │      │                             │
│   TransitionCompleted──┼─────►│ • Subscribes to completion  │
│   WorkflowCompleted  ──┼─────►│   events to update Asset    │
│   SLABreached        ──┼──┐   │   status and assignment     │
└────────────────────────┘  │   └─────────────────────────────┘
                            │
                            │   ┌─────────────────────────────┐
                            └──►│   ComplianceModule          │
                                │ • Subscribes to SLABreached │
                                │ • Generates escalation      │
                                └─────────────────────────────┘
```

**Why this split?** If the engine knew about "allocation" directly, adding
a new workflow type (say, "asset transfer" in a future release) would
require modifying the engine. By keeping the engine generic, new workflow
types are added by creating a new definition and a new domain module — the
engine code doesn't change. This is the Strategy Pattern (§7.4) at the
architectural level.

### 9.3 SLA Timer Mechanism

- Each `WorkflowStage` has an optional `sla_hours` field.
- When a workflow instance enters a stage, the engine records the entry
  timestamp on the transition.
- A scheduled job (cron, every 15 minutes) queries for active workflow
  instances where `now() - stage_entry_time > sla_hours` and no
  `SLABreached` event has been emitted yet for that stage.
- On detection, it emits `SLABreached` → Compliance module records the
  breach, Notification module emails the manager.

**Why a scheduled job, not a per-instance timer?** At enterprise scale
(hundreds, not millions, of concurrent workflows), a periodic sweep is
simpler, more debuggable, and more resilient than managing thousands of
individual timers or delayed queue messages. If a timer is missed due to a
restart, the next sweep catches it. The 15-minute granularity is acceptable
because SLAs are measured in hours/days, not minutes.

---

## 10. RBAC Architecture

### 10.1 Model

```
User ──── has one ───► Role ──── has many ───► Permission
                        │
                  ┌─────┴──────┐
                  │             │
            Super Admin    Stores Officer
            IT Rep         P&C
            Employee
```

**Roles** are fixed in V1 (the 5 defined in the prompt). Each role maps to
a set of **Permissions** (fine-grained action strings).

**Why not dynamic roles in V1?** The prompt defines exactly 5 roles with
specific, non-overlapping responsibilities. Dynamic role creation adds
complexity (UI for role builder, permission matrix) without solving a stated
requirement. The architecture *supports* it (roles and permissions are in
the database, not code enums), but the admin UI for creating custom roles
is deferred.

### 10.2 Permission Granularity

Permissions follow the format `<resource>:<action>`:

```
asset:create          asset:read           asset:update
asset:delete          asset:change_status  asset:dispose
employee:create       employee:read        employee:update
allocation:request    allocation:review    allocation:select_asset
allocation:assess     allocation:sign      allocation:bypass
return:initiate       return:complete      return:sign
assessment:create     assessment:complete
repair:create         repair:update        repair:complete
disposal:request      disposal:approve
report:inventory      report:compliance    report:export
workflow:configure    user:manage          master_data:manage
```

### 10.3 Role-Permission Mapping

| Permission | Super Admin | Stores | IT | P&C | Employee |
|---|---|---|---|---|---|
| `asset:create` | x | x | | | |
| `asset:read` | x | x | x | x | own |
| `asset:change_status` | x | x | | | |
| `allocation:request` | x | | | | x |
| `allocation:review` | x | | | x | |
| `allocation:select_asset` | x | x | | | |
| `allocation:assess` | x | | x | | |
| `allocation:sign` | x | | x | x | x |
| `allocation:bypass` | x | | | | |
| `return:initiate` | x | | | x | |
| `assessment:create` | x | | x | | |
| `disposal:approve` | x | | | | |
| `report:compliance` | x | | | x | |
| `workflow:configure` | x | | | | |
| `user:manage` | x | | | | |

(`own` = can read only their own assigned assets / profile)

### 10.4 Enforcement Layers

RBAC is enforced at **three independent layers** — any one of them failing
does not compromise the others:

**Layer 1: API Guard (NestJS Guard)**
```
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('allocation:review')
@Post('/allocations/:id/review')
async reviewAllocation(...)
```
The `RbacGuard` reads the `@Roles()` metadata, loads the user's permissions
from the JWT claims (or cache), and rejects the request with 403 if the
permission is missing. This prevents unauthorized HTTP access.

**Layer 2: Domain-level check (Workflow Engine)**
The state machine's transition algorithm (§8.3 step 2) independently
verifies the acting user's role against the `required_role` configured on
the target workflow stage. Even if the guard is misconfigured or bypassed
(e.g., internal module-to-module call), the engine rejects the transition.
This prevents unauthorized workflow state changes.

**Layer 3: UI filtering (Frontend)**
The frontend receives the user's permissions on login and conditionally
renders navigation items, buttons, and form fields. This is UX convenience,
not security — the user simply doesn't see actions they can't perform,
reducing confusion and support tickets. It is never relied upon as a
security boundary.

**Why three layers?** Defense-in-depth. The prompt says "protect every API
endpoint" (BR-3.3) *and* "users only see actions relevant to their role"
(BR-3.2). Layer 1 handles the API protection, Layer 3 handles the UI
filtering, and Layer 2 covers the gap where a module internally triggers a
workflow action (not via HTTP) — the engine still validates authorization.

### 10.5 Row-Level Scoping

Some permissions are scoped to the user's own data:
- Employees see only their own assigned assets and request history.
- Dashboard data is filtered by role (Stores sees inventory metrics; P&C
  sees compliance metrics; Employees see only their pending items).

This is implemented as query-level filtering in the repository layer: the
Application Service passes the current user's identity and role, and the
repository applies a WHERE clause. This is not a separate authorization
check — it's how "read own" permissions manifest in queries.

---

## 11. Notification Architecture

### 11.1 Design Principles

1. **Event-driven** — Notifications are triggered by domain events, never
   by direct calls from workflow code.
2. **Decoupled** — The Notification module subscribes to events; domain
   modules don't import or know about it.
3. **Templateable** — Notification content is generated from templates, not
   hardcoded strings.
4. **Configurable** — Which events produce which notifications to which
   roles is configuration, not code.
5. **Digestable** — Users can choose immediate or daily-digest for FYI
   notifications (WF-10).

### 11.2 Architecture

```
Domain Event (e.g., TransitionCompleted)
       │
       ▼
┌──────────────────────────────────┐
│   NotificationEventSubscriber    │
│                                  │
│ 1. Looks up NotificationRule     │
│    for this event type           │
│ 2. Resolves recipients           │
│    (by role, by relationship)    │
│ 3. For each recipient:           │
│    a. Check digest preference    │
│    b. If immediate → queue now   │
│    c. If digest → store for      │
│       batch send                 │
│ 4. Creates Notification record   │
│    (for in-app notification      │
│     center + delivery tracking)  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────┐
│   Notification Queue  │  ◄── in-process queue (Bull/BullMQ on Redis)
│                       │
│ • Retry on failure    │
│ • Rate limiting       │
│ • Dead-letter on      │
│   permanent failure   │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│   EmailSender        │  ◄── §13 Email Architecture
│   (Nodemailer)       │
└──────────────────────┘
```

### 11.3 Notification Rules (data-driven)

```
NotificationRule
├── id
├── event_type: "TransitionCompleted" | "SLABreached" | ...
├── workflow_type: "allocation" | "return" | null (all)
├── stage_name: "P&C Review" | null (all stages)
├── recipient_strategy: "ACTING_USER" | "ROLE" | "MANAGER_OF" | "ASSET_HOLDER"
├── recipient_role: "P&C" | "IT" | null
├── template_id → NotificationTemplate
├── priority: "IMMEDIATE" | "DIGESTABLE"
└── is_active: boolean
```

**Why data-driven rules?** The prompt says notifications go to Employee,
IT, Stores, P&C on events like Allocation, Assessment, Return, etc. — but
doesn't specify exactly *which* role gets notified at *which* stage. Making
this configurable means the business can tune it without code changes, and
the table above doubles as living documentation of the notification matrix.

### 11.4 In-App Notification Center

Beyond email, a `notifications` table tracks every notification with
`is_read` status. The frontend polls or uses SSE (Server-Sent Events) for
real-time updates. The dashboard's "Pending approvals / assessments /
returns / requests" widgets (FR-DASH-03) are powered by querying this
table + workflow instance state.

**Why not WebSockets?** SSE is simpler (one-directional, auto-reconnects,
works through proxies), and notifications are a one-way server→client
push with no client→server messaging needed. WebSockets add bidirectional
complexity for no gain here.

---

## 12. Audit Architecture

### 12.1 Requirements Recap

- Log every state-changing action (FR-AUDIT-01).
- Capture: User, Action, Timestamp, Old Value, New Value, IP Address
  (FR-AUDIT-02).
- Append-only / immutable (FR-AUDIT-03, NFR-SEC-05).

### 12.2 Collection Strategy — Dual-Path

Audit entries are collected through two complementary paths:

**Path 1: AuditInterceptor (automatic, coarse-grained)**

A NestJS interceptor wraps every `POST`, `PUT`, `PATCH`, `DELETE`
controller method. It captures:
- The requesting user (from JWT).
- The IP address (from request headers / socket).
- The action (derived from route + HTTP method).
- The timestamp.
- The response status.

This catches everything — even if a developer forgets to add explicit
audit logging in their service code.

**Path 2: Domain Event Subscribers (explicit, fine-grained)**

For business-significant events (workflow transitions, status changes,
disposal approvals), the `AuditEventSubscriber` listens to domain events
and writes detailed entries with Old Value / New Value diffs. These
entries carry richer context than the interceptor can capture (e.g., "asset
status changed from Available to Allocated" with both values).

**Why two paths?** The interceptor is the safety net — it guarantees
nothing is missed, satisfying "log every action." But its entries are
generic ("POST /allocations/123/review → 200"). The event subscriber
adds business meaning ("Allocation #123 advanced from P&C Review to
Stores Select by user jane@co.com"). Together they provide both
completeness and clarity.

### 12.3 Immutability Enforcement

Audit log immutability is enforced at **multiple levels**:

**Level 1: Application — No update/delete API**
The `AuditModule` exposes only `log()` (write) and `query()` (read) on its
public API. There is no `update()` or `delete()` method. No controller
endpoint maps to UPDATE or DELETE on audit entries.

**Level 2: Database — Revoke mutation privileges**
The application's database user for audit writes is granted `INSERT` and
`SELECT` only on the `audit_logs` table — no `UPDATE`, no `DELETE`. A
separate restricted role is used for audit writes vs. normal application
writes.

```sql
CREATE ROLE audit_writer;
GRANT INSERT, SELECT ON audit_logs TO audit_writer;
-- No UPDATE, no DELETE granted
```

**Level 3: Database — Row-level prevention (belt and suspenders)**
A PostgreSQL trigger rejects any `UPDATE` or `DELETE` on `audit_logs`:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutability
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
```

**Level 4: Integrity verification (tamper detection)**
Each audit entry includes a `hash` field: SHA-256 of the entry's content +
the previous entry's hash (hash chain). A periodic verification job walks
the chain and alerts if any entry has been tampered with (a modified entry
would break the chain from that point forward). This doesn't prevent
tampering by someone with raw DB access — it *detects* it.

**Why four levels?** Because "immutable audit logs" is a compliance
requirement (BR-13.3), not just a nice-to-have. Any single mechanism can
be circumvented by a sufficiently privileged actor (a compromised Super
Admin could call a raw SQL endpoint if only Level 1 existed; a DBA could
bypass Level 2 with a superuser role). Layering makes circumvention
require compromise of multiple independent controls, which is the standard
approach for high-integrity audit systems. Level 4 (hash chain) provides
after-the-fact detection even if Levels 1-3 are all bypassed.

### 12.4 Audit Log Schema

```
audit_logs
├── id: BIGINT (monotonic, no gaps — use SERIAL or IDENTITY)
├── hash: VARCHAR(64) — SHA-256 chain hash
├── previous_hash: VARCHAR(64)
├── user_id: UUID → users (nullable for system actions)
├── user_email: VARCHAR — denormalized for queryability after user deletion
├── action: VARCHAR — e.g., "ASSET_CREATED", "WORKFLOW_TRANSITION"
├── resource_type: VARCHAR — e.g., "asset", "workflow_instance"
├── resource_id: VARCHAR — the affected entity's ID
├── old_value: JSONB (nullable)
├── new_value: JSONB (nullable)
├── ip_address: INET
├── user_agent: VARCHAR
├── timestamp: TIMESTAMPTZ — server-generated, not client-supplied
├── metadata: JSONB — any additional context
└── INDEX on (resource_type, resource_id), (user_id), (timestamp), (action)
```

---

## 13. Email Architecture

### 13.1 Design

```
┌──────────────────────────────────────────────────────┐
│                 Email Architecture                    │
│                                                      │
│  ┌────────────────┐     ┌──────────────────────┐    │
│  │ Notification   │────►│   EmailService        │    │
│  │ Queue (Redis)  │     │   (Application Layer) │    │
│  └────────────────┘     │                       │    │
│                         │ • Resolves template   │    │
│                         │ • Renders with data   │    │
│                         │ • Calls transport     │    │
│                         └───────────┬───────────┘    │
│                                     │                │
│                         ┌───────────▼───────────┐    │
│                         │  EmailTransport       │    │
│                         │  (Infrastructure)     │    │
│                         │                       │    │
│                         │ • Interface:          │    │
│                         │   send(to, subject,   │    │
│                         │   html, attachments)  │    │
│                         │                       │    │
│                         │ • Implementations:    │    │
│                         │   ├── SmtpTransport   │    │
│                         │   ├── SesTransport    │    │
│                         │   └── ConsoleTransport│    │
│                         │       (dev/test)      │    │
│                         └───────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 13.2 Template System

Email templates are stored as files (Handlebars `.hbs` or similar) in the
backend's `templates/email/` directory, not in the database. Each template
corresponds to a notification event type:

```
templates/email/
├── allocation-request-submitted.hbs
├── allocation-review-required.hbs
├── allocation-completed.hbs
├── return-initiated.hbs
├── assessment-required.hbs
├── sla-breach-escalation.hbs
├── digest.hbs                    # Daily digest wrapper
└── layouts/
    └── base.hbs                  # Common header/footer
```

**Why file-based templates, not database?** Templates change with code
deployments (new fields, layout updates), not at runtime by admins.
Keeping them in version control means changes are reviewed, tested, and
deployed together with the code that produces the template data.

### 13.3 Queue-Based Delivery

Emails are sent via a job queue (BullMQ on Redis), not synchronously
during request handling.

**Why?** (1) SMTP delivery can take 1-5 seconds; blocking the HTTP
response on it degrades the user experience. (2) SMTP servers have rate
limits; a queue naturally throttles. (3) Transient SMTP failures should
retry automatically, not fail the business operation. (4) The user's
workflow transition should succeed even if the mail server is temporarily
down — the email is a side effect, not a precondition.

### 13.4 Digest Mechanism

- A `notification_preferences` table stores per-user, per-event-category
  preferences: `IMMEDIATE` or `DIGEST`.
- IMMEDIATE: the email job is queued immediately on event.
- DIGEST: the notification record is stored with `delivery_method = DIGEST`.
- A daily scheduled job (e.g., 08:00 local time) collects all undelivered
  DIGEST notifications per user, renders them into a single digest email
  using `digest.hbs`, and queues it.

### 13.5 Delivery Tracking

```
email_deliveries
├── id
├── notification_id → notifications
├── recipient_email
├── subject
├── status: QUEUED | SENT | FAILED | BOUNCED
├── attempts: INT
├── last_attempt_at
├── error_message (nullable)
└── sent_at (nullable)
```

This provides operational visibility into email reliability and lets
support staff answer "did the notification email get sent?" without
checking mail server logs.

---

## 14. Logging Strategy

### 14.1 Three Distinct Log Streams

This system has three different "logging" concerns, each with different
consumers, retention, and formats. Conflating them is a common enterprise
mistake — they are kept strictly separate:

| Stream | Purpose | Consumer | Retention | Storage |
|---|---|---|---|---|
| **Audit Log** (§12) | Business accountability — who did what, when, to which asset | Compliance officers, auditors, legal | Permanent (regulatory) | PostgreSQL `audit_logs` table, immutable |
| **Application Log** | Operational diagnostics — errors, warnings, request traces, performance | DevOps, on-call engineers | 30-90 days | Structured JSON → stdout → log aggregator (ELK, CloudWatch, etc.) |
| **Access Log** | HTTP request/response metadata — path, status, latency, IP | Security, capacity planning | 90 days | Reverse proxy / load balancer, or NestJS middleware |

**Why separate them?** An audit entry is a business record ("Jane approved
disposal of asset #4521"); an application log entry is a technical record
("TypeORM query took 450ms on table assets"); an access log entry is an
infrastructure record ("GET /api/assets 200 12ms"). They have different
schemas, different retention requirements, different access controls, and
different consumers. Mixing them into one table or log file makes all three
worse.

### 14.2 Application Logging

**Format**: Structured JSON, one object per line, written to `stdout`.

```json
{
  "level": "error",
  "timestamp": "2026-07-09T14:32:01.123Z",
  "service": "it-asset-platform",
  "module": "workflow",
  "requestId": "req-abc123",
  "userId": "user-456",
  "message": "Transition validation failed",
  "error": {
    "name": "ValidationError",
    "message": "Asset #789 is not in Available status",
    "stack": "..."
  },
  "context": {
    "workflowInstanceId": "wf-012",
    "targetStage": "stores_select"
  }
}
```

**Why structured JSON to stdout?**
- JSON is machine-parseable by any log aggregator (ELK, Datadog,
  CloudWatch, Grafana Loki) without custom parsers.
- stdout is the 12-factor app convention — the application doesn't decide
  where logs go; the runtime environment (Docker, K8s, systemd) routes
  them. This makes the same code work in dev (console), CI (captured by
  test runner), and production (shipped to aggregator) with zero config
  changes.
- Structured fields (module, requestId, userId) enable filtering and
  correlation that `console.log("something went wrong")` never can.

**Library**: NestJS built-in Logger wrapped with a custom transport that
outputs structured JSON (or `pino` for lower overhead — decided at
implementation time).

### 14.3 Log Levels

| Level | When to use | Example |
|---|---|---|
| `error` | Unrecoverable failure, requires investigation | Database connection lost, email delivery permanently failed |
| `warn` | Unexpected but handled condition | SLA threshold not configured for a stage, retry attempt on SMTP |
| `info` | Significant business event (sparse) | Workflow completed, user logged in, report generated |
| `debug` | Diagnostic detail (disabled in production by default) | SQL queries, cache hits/misses, event bus dispatch |

**Rule**: `info` level in production should produce ~1-5 log lines per
user request. If it produces more, some entries should be `debug`.

### 14.4 Request Correlation

Every incoming HTTP request is assigned a unique `requestId` (UUID) by
middleware. This ID is:
- Attached to every log entry produced during that request.
- Passed to downstream service calls (if any, future-proofing).
- Returned in the response headers (`X-Request-Id`) so the frontend can
  include it in error reports.
- Recorded on the audit log entry if one is produced.

**Why?** When a user reports "I clicked approve and got an error," the
support team needs to trace every log entry from that single request. A
requestId makes this a one-field filter instead of a timestamp-range guess.

### 14.5 Sensitive Data Handling

Application logs must **never** contain:
- Passwords or tokens (even hashed).
- Full request bodies on auth endpoints.
- PII beyond what's necessary for debugging (user ID is fine; full
  employee address is not).

This is enforced by a log sanitization layer that redacts known sensitive
fields before serialization.

---

## 15. Data Architecture

### 15.1 Database Strategy

**Single PostgreSQL database**, one schema, with strict module ownership
of tables. Cross-module reads go through module APIs, not direct JOINs.

**Why single database?** Transactional consistency (§1.1) — the workflow
transition, asset status update, and audit entry must be one transaction.

**Why not per-module schemas?** At this scale (< 30 tables), the
operational overhead of managing multiple schemas (migrations, backups,
cross-schema queries for reporting) outweighs the isolation benefit.
Module ownership is enforced at the code level (repository encapsulation),
not the database level.

### 15.2 Key Design Decisions

- **UUIDs for primary keys** on all business entities (assets, employees,
  workflow instances). UUIDs prevent enumeration attacks (guessing the
  next asset ID) and simplify data import (no sequence collisions). BIGINT
  SERIAL for audit_logs (ordering matters, gaps don't, and the
  monotonic guarantee simplifies hash-chain verification).

- **TIMESTAMPTZ for all timestamps** — stored in UTC, rendered in local
  time by the frontend. No timezone ambiguity in audit records.

- **JSONB for flexible/varying fields** — assessment checklist results
  (different device types may have different applicable checks),
  notification rule conditions, workflow stage validation rules. Avoids
  an explosion of relational tables for inherently schemaless data, while
  remaining queryable via PostgreSQL's JSONB operators.

- **Soft deletes via status, not a `deleted_at` column** — Assets use the
  `Disposed` status; Employees use `Employment Status`; workflow instances
  use `CANCELLED`. No record is physically deleted. This satisfies BR-12.3
  (never delete disposed assets) and general auditability.

- **Optimistic locking** via a `version` column on `assets` and
  `workflow_instances` — prevents the race condition (R-10) where two
  Stores Officers select the same Available asset simultaneously. The
  second transaction sees a version mismatch and fails cleanly.

### 15.3 Indexing Strategy

| Table | Index | Rationale |
|---|---|---|
| `assets` | `UNIQUE(asset_tag)` | FR-INV-03 uniqueness |
| `assets` | `UNIQUE(serial_number)` | FR-INV-03 uniqueness |
| `assets` | `(status)` | Dashboard counts, available-asset queries |
| `assets` | `(department_id)` | Charts, scoping |
| `assets` | `(current_holder_id)` | Employee asset lookup |
| `assets` | GIN on `(asset_tag, serial_number, imei)` or full-text | Global search |
| `workflow_instances` | `(status, current_stage_id)` | Pending queues |
| `workflow_instances` | `(reference_type, reference_id)` | Find workflow for a given request |
| `workflow_transitions` | `(workflow_instance_id, performed_at)` | Transition history timeline |
| `audit_logs` | `(resource_type, resource_id)` | "Show me all changes to asset X" |
| `audit_logs` | `(user_id, timestamp)` | "Show me what user Y did today" |
| `audit_logs` | `(timestamp)` | Time-range queries for activity feed |
| `employees` | `(department_id)` | Department-scoped queries |
| `employees` | `(email)` UNIQUE | Login lookup |
| `notifications` | `(recipient_id, is_read, created_at)` | Unread notification count/list |

### 15.4 Reporting Views

For the 8 report types (FR-REPORT-01), create **PostgreSQL views** that
pre-join the required tables. The Report module queries these views rather
than building complex JOINs in application code. Benefits:
- Query logic is version-controlled (in migrations).
- The ORM doesn't need to express complex aggregations.
- Views can later be materialized if performance requires it (NFR-PERF-02)
  without changing application code.

---

## 16. API Architecture

### 16.1 Conventions

| Concern | Convention |
|---|---|
| Base path | `/api/v1/` |
| Resource naming | Plural nouns: `/assets`, `/employees`, `/allocations` |
| HTTP methods | GET (read), POST (create/action), PUT (full replace), PATCH (partial update), DELETE (deactivate) |
| Pagination | `?page=1&limit=20` → response includes `{ data: [], meta: { total, page, limit, totalPages } }` |
| Filtering | Query params: `?status=available&department=IT` |
| Sorting | `?sort=created_at&order=desc` |
| Error format | `{ error: { code: "VALIDATION_ERROR", message: "...", details: [...] } }` |
| Success format | `{ data: {...} }` or `{ data: [...], meta: {...} }` |

### 16.2 Endpoint Overview

```
Auth
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout
  GET    /api/v1/auth/me

Users
  GET    /api/v1/users
  POST   /api/v1/users
  GET    /api/v1/users/:id
  PATCH  /api/v1/users/:id
  PATCH  /api/v1/users/:id/role

Employees
  GET    /api/v1/employees
  POST   /api/v1/employees
  GET    /api/v1/employees/:id
  PATCH  /api/v1/employees/:id
  GET    /api/v1/employees/:id/assets
  GET    /api/v1/employees/:id/history

Assets
  GET    /api/v1/assets
  POST   /api/v1/assets
  GET    /api/v1/assets/:id
  PATCH  /api/v1/assets/:id
  GET    /api/v1/assets/:id/history
  GET    /api/v1/assets/:id/accessories
  POST   /api/v1/assets/:id/accessories
  GET    /api/v1/assets/:id/barcode        (generates barcode/QR image)

Acquisitions
  GET    /api/v1/acquisitions
  POST   /api/v1/acquisitions
  GET    /api/v1/acquisitions/:id

Allocations
  GET    /api/v1/allocations
  POST   /api/v1/allocations               (employee submits request)
  GET    /api/v1/allocations/:id
  POST   /api/v1/allocations/:id/transition (advance workflow)

Returns
  GET    /api/v1/returns
  POST   /api/v1/returns
  GET    /api/v1/returns/:id
  POST   /api/v1/returns/:id/transition

Assessments
  GET    /api/v1/assessments
  POST   /api/v1/assessments
  GET    /api/v1/assessments/:id
  PATCH  /api/v1/assessments/:id            (complete checklist)

Repairs
  GET    /api/v1/repairs
  POST   /api/v1/repairs
  GET    /api/v1/repairs/:id
  PATCH  /api/v1/repairs/:id

Disposals
  GET    /api/v1/disposals
  POST   /api/v1/disposals
  GET    /api/v1/disposals/:id
  POST   /api/v1/disposals/:id/approve

Vendors
  GET    /api/v1/vendors
  POST   /api/v1/vendors
  GET    /api/v1/vendors/:id
  PATCH  /api/v1/vendors/:id

Dashboard
  GET    /api/v1/dashboard/summary
  GET    /api/v1/dashboard/charts/:type
  GET    /api/v1/dashboard/activity
  GET    /api/v1/dashboard/pending

Reports
  GET    /api/v1/reports/:type              (JSON data)
  GET    /api/v1/reports/:type/export       (?format=pdf|xlsx|csv)

Notifications
  GET    /api/v1/notifications
  PATCH  /api/v1/notifications/:id/read
  GET    /api/v1/notifications/preferences
  PATCH  /api/v1/notifications/preferences

Search
  GET    /api/v1/search?q=...

Audit Logs
  GET    /api/v1/audit-logs                 (Super Admin / Compliance only)

Compliance
  GET    /api/v1/compliance/breaches
  GET    /api/v1/compliance/escalations

Master Data
  GET    /api/v1/master-data/departments
  POST   /api/v1/master-data/departments
  ...    (same pattern for offices, device-types, brands)

Workflow Definitions (Super Admin)
  GET    /api/v1/workflow-definitions
  GET    /api/v1/workflow-definitions/:id
  PATCH  /api/v1/workflow-definitions/:id
```

### 16.3 The `/transition` Endpoint

The unified transition endpoint is the single entry point for all workflow
state changes:

```
POST /api/v1/allocations/:id/transition
{
  "target_stage": "stores_select_asset",
  "payload": {
    "selected_asset_id": "asset-uuid-123"
  },
  "signature": {                         // if this stage requires it
    "full_name": "Jane Smith",
    "consent": true
  },
  "reason": "..."                        // required for bypass/rejection
}
```

**Why a single transition endpoint instead of stage-specific endpoints?**
(e.g., `/review`, `/select-asset`, `/assess`) Because the workflow stages
are configurable — a new stage added to the definition should not require
a new controller endpoint. The engine validates the transition against the
definition; the controller just passes it through.

---

## 17. Security Architecture

### 17.1 Authentication Flow

```
Client                          Server
  │                               │
  │  POST /auth/login             │
  │  { email, password }          │
  │──────────────────────────────►│
  │                               │── Verify password hash
  │                               │── Generate JWT access token (15min)
  │                               │── Generate refresh token (7d), store in DB
  │  { accessToken, refreshToken, │
  │    user: { id, role, perms }} │
  │◄──────────────────────────────│
  │                               │
  │  GET /api/v1/assets           │
  │  Authorization: Bearer {jwt}  │
  │──────────────────────────────►│
  │                               │── JwtAuthGuard: verify signature + expiry
  │                               │── RbacGuard: check permission
  │  { data: [...] }              │
  │◄──────────────────────────────│
  │                               │
  │  POST /auth/refresh           │
  │  { refreshToken }             │
  │──────────────────────────────►│
  │                               │── Verify refresh token exists + not expired
  │                               │── Rotate: invalidate old, issue new pair
  │  { accessToken, refreshToken }│
  │◄──────────────────────────────│
```

### 17.2 Token Design

- **Access Token (JWT)**: Short-lived (15 minutes), stateless, contains
  `{ userId, role, permissions[] }` in claims. Not stored server-side.
- **Refresh Token**: Long-lived (7 days), opaque random string, stored in
  `refresh_tokens` table. Rotated on every use (old one invalidated).
  One-to-many: a user can have multiple active refresh tokens (one per
  device).

**Why rotate refresh tokens?** If a refresh token is stolen, the attacker
can use it once. When the legitimate user's next refresh request fails
(their token was already consumed by the attacker), the system detects
the anomaly and can invalidate all of that user's refresh tokens, forcing
re-login.

### 17.3 Input Validation

- All incoming DTOs validated via `class-validator` decorators (NestJS
  ValidationPipe) — type, length, format, enum values checked before
  reaching the service layer.
- All database queries use parameterized queries (ORM-generated) — no
  string concatenation.
- File uploads validated by MIME type, file extension, and size limit
  (configurable, default 10MB). Files stored outside the web root.
- All user-generated content (notes, reasons, damage descriptions) HTML-
  escaped on output (React does this by default; API responses use JSON,
  not raw HTML).

### 17.4 CSRF Protection

The API is a stateless JWT-based REST API consumed by a separate SPA.
CSRF is only a concern for cookie-based auth. Since tokens are stored in
memory (not cookies) and sent via `Authorization` header, CSRF is
structurally not applicable. If cookies are later used for refresh tokens
(e.g., `httpOnly` cookie for XSS protection), `SameSite=Strict` + CSRF
token double-submit will be added.

---

## 18. Error Handling Strategy

### 18.1 Error Hierarchy

```
BaseError (abstract)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ValidationError (400)
│   └── field-level detail array
├── ConflictError (409)
│   └── optimistic lock failures, duplicate asset tag
├── WorkflowError (422)
│   └── invalid transition, missing signature, SLA-related
└── InternalError (500)
    └── unexpected failures, logged with stack trace
```

### 18.2 Error Response Format

```json
{
  "error": {
    "code": "WORKFLOW_INVALID_TRANSITION",
    "message": "Cannot transition from 'P&C Review' to 'IT Assessment' — 'Stores Select Asset' must come first",
    "details": [
      {
        "field": "target_stage",
        "constraint": "The target stage is not an allowed next state from the current stage"
      }
    ],
    "requestId": "req-abc123"
  }
}
```

**Why include `requestId` in error responses?** So end users (or support
staff) can quote a correlation ID when reporting problems, linking back to
the full application log chain (§14.4) without exposing internal details.

### 18.3 Global Exception Filter

A NestJS `AllExceptionsFilter` catches all unhandled exceptions, maps
them to the error response format, logs them at the appropriate level
(`warn` for 4xx, `error` for 5xx), and ensures no stack traces or internal
details leak to the client in production.

---

## Architecture Decision Records (summary)

| ID | Decision | Rationale |
|---|---|---|
| ADR-01 | Modular monolith over microservices | Transactional consistency, operational simplicity, team size |
| ADR-02 | NestJS over Express | First-class DI, modules, guards, interceptors match requirements |
| ADR-03 | PostgreSQL over NoSQL | Relational integrity for asset/workflow/audit data; JSONB for flexible fields |
| ADR-04 | In-process event bus over message broker | Monolith; no need for cross-service messaging |
| ADR-05 | Generic workflow engine over per-workflow code | "Avoid hardcoded workflow logic" requirement; extensibility |
| ADR-06 | Dual-path audit collection | Completeness (interceptor) + business clarity (events) |
| ADR-07 | 4-level audit immutability | Defense-in-depth for compliance requirement |
| ADR-08 | Queue-based email over synchronous | Don't block business operations on SMTP latency/failures |
| ADR-09 | Structured JSON logging to stdout | 12-factor; machine-parseable; environment-agnostic routing |
| ADR-10 | SSE over WebSocket for notifications | Simpler; one-directional push is sufficient |
| ADR-11 | UUIDs for business PKs, BIGINT for audit | Prevent enumeration; monotonic ordering for hash chain |
| ADR-12 | File-based email templates over DB | Version-controlled, reviewed, deployed with code |
| ADR-13 | Optimistic locking over pessimistic | Prevents race conditions without lock contention |
