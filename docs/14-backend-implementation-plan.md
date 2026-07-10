# Backend Implementation Plan

Per-module breakdown of what has to be built for the backend, expressed in
the eleven layers requested: Controllers, Services, Repositories, DTOs,
Entities, Middleware, Policies, Validators, Events, Queues, Cron Jobs.

Descriptions only — no code. This document names the components that will
exist and defines their responsibilities. Actual signatures, class shape,
and file layout follow the folder structure in
[`09-architecture.md`](09-architecture.md) §6, and every table/schema
reference lives in [`10-database-design.md`](10-database-design.md).

## Tech-stack recap (from `09-architecture.md` §2)

NestJS + TypeScript on Node.js; PostgreSQL 16; Redis for cache and queue
backing; TypeORM/Prisma (decided at M1); BullMQ for background jobs;
`@nestjs/schedule` for cron; `@nestjs/event-emitter` for the in-process
event bus; Nodemailer + S3-compatible object storage; class-validator +
class-transformer for DTO validation.

Every module is a NestJS module. The four internal layers are Presentation
(controllers/DTOs) → Application (use-case services) → Domain (entities,
value objects, domain services, domain events) → Infrastructure
(repositories, external adapters). The domain layer has no outward
dependencies (arch §1.2).

---

## 0. Common Kernel (applies to every module)

These live in `packages/backend/src/common/` and are wired at the app
root. Modules consume them, don't redefine them. Per-module sections below
only list what a module *adds on top* of this baseline.

### 0.1 Global middleware (per-request, runs before guards)

| Middleware | Responsibility |
|---|---|
| **CorrelationIdMiddleware** | Attaches an `X-Correlation-ID` to every request (accept incoming header if present and trusted; otherwise generate). Propagated to logs, audit entries, and outbound HTTP. |
| **AsyncContextMiddleware** | Populates `AsyncLocalStorage` with `{ correlationId, requestId, userId?, ip, userAgent }` so any downstream code — including repositories, event handlers, queue producers — can read the caller without threading context through every method signature. |
| **RequestLoggingMiddleware** | Emits structured start/finish log per request with method, path, status, duration, correlation ID. |
| **HelmetMiddleware** | Standard security headers (CSP, X-Frame-Options, etc.). |
| **BodyParserLimits** | JSON/urlencoded size caps; multipart uploads routed to the file module. |
| **CsrfMiddleware** | Double-submit-cookie CSRF protection for cookie-based browser sessions. Skipped for pure Bearer-token API calls. |
| **RateLimitMiddleware** | Redis-backed sliding-window limit. Global default + per-route overrides via `@RateLimit()` decorator (login, password reset, file upload, search have stricter limits). |

### 0.2 Global guards (RBAC / auth enforcement)

| Guard | Responsibility |
|---|---|
| **JwtAuthGuard** | Validates the access token, hydrates `req.user`, rejects expired or revoked tokens. |
| **RbacGuard** | Reads `@Roles()` / `@Permissions()` on the handler and calls `RbacService.checkPermission`. |
| **PolicyGuard** | Invokes registered per-module policies (`@UsePolicy(Policy)`) against the resolved resource. Where RBAC answers *"can this role do this class of thing?"* PolicyGuard answers *"can this user do it to this specific record?"* (owner checks, department scoping, workflow-stage role match). |
| **ThrottlerGuard** | Route-level throttle in front of RateLimitMiddleware for expensive handlers (report generation, search). |

### 0.3 Global interceptors

| Interceptor | Responsibility |
|---|---|
| **LoggingInterceptor** | Structured log of handler entry/exit with sanitized payloads (PII/secret redaction per §14.5 of arch). |
| **AuditInterceptor** | Handlers decorated `@Auditable(action, entityType)` are auto-captured: before/after entity state, actor, IP, correlation ID, written via `AuditService` on success. |
| **TransactionInterceptor** | `@Transactional()` opens a DB transaction on the request-scoped `UnitOfWork`, commits on success, rolls back on any thrown exception. |
| **CacheInterceptor** | Short-TTL read caching for whitelisted GETs (dashboard counts, master-data lookups). |

### 0.4 Global filters & pipes

| Component | Responsibility |
|---|---|
| **GlobalExceptionFilter** | Maps thrown `DomainError` / `AppError` / framework errors to the standard API error envelope defined in arch §18.2 (code, message, correlationId, details). Never leaks stack traces to clients. |
| **GlobalValidationPipe** | Runs class-validator on every DTO with `whitelist: true, forbidNonWhitelisted: true, transform: true`. Rejects unknown fields — no silent field drops. |
| **ParseUuidPipe / ParseIntPipe** | Route-param type coercion with 400 on malformed input. |

### 0.5 Shared kernel primitives

| Primitive | Responsibility |
|---|---|
| **IRepository<TAggregate>** | Base repository interface: `getById`, `save`, `remove`. Concrete repositories extend for aggregate-specific finders. |
| **UnitOfWork** | Wraps a TypeORM `QueryRunner` (or Prisma interactive tx). Provides `withTransaction(callback)`. Enforces one active transaction per request. |
| **DomainEvent (base class)** | `id`, `occurredAt`, `correlationId`, `causedBy`. |
| **EventPublisher** | Thin wrapper around `@nestjs/event-emitter` with typed event contracts + a durable outbox table for events with delivery guarantees (compliance-critical: `AssetDisposed`, `WorkflowBypassed`, `SLABreached`). |
| **OutboxDispatcher** | Cron-driven relay that publishes rows from the outbox table to real subscribers once the source transaction commits; guarantees at-least-once delivery. |
| **QueueModule** | BullMQ configuration bound to Redis, dead-letter queue, job telemetry (Prometheus counters), retry/back-off defaults. |
| **ScheduleModule** | `@nestjs/schedule` wired with `SchedulerRegistry` so cron jobs can be listed, paused, and reconfigured at runtime by a Super Admin. |
| **ClockService** | Injectable time source so scheduled logic and SLA math are testable without freezing the process clock. |
| **IdGenerator** | UUIDv7 for entity IDs (time-sortable, index-friendly). |

---

## 1. AuthModule — Identity & session management

Owns login, token issuance/refresh, logout, password reset, and account
lockout. Read [`09-architecture.md`](09-architecture.md) §17 for the auth
flow and token design.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AuthController` — `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`. User creation lives in `AdminUserController` (§ user admin) because register is not self-serve. |
| **Services** | `LoginUseCase` (verify credentials, issue tokens, record login). `RefreshTokenUseCase` (rotate refresh token, blacklist old). `LogoutUseCase` (revoke refresh token, blacklist active access token). `PasswordResetRequestUseCase`, `PasswordResetCompleteUseCase`, `ChangePasswordUseCase`. Domain services: `PasswordHasher` (bcrypt/argon2), `TokenService` (JWT sign/verify with rotation-safe key IDs), `LockoutPolicy` (fail-count + cool-down). |
| **Repositories** | `UserCredentialRepository` (find by email, update password hash, increment/reset failed attempts, lock account). `RefreshTokenRepository` (create, findByHash, revoke, revokeAllForUser). `PasswordResetTokenRepository` (single-use tokens with expiry). |
| **DTOs** | `LoginRequestDto`, `LoginResponseDto` (accessToken, refreshToken, expiresIn, user summary). `RefreshRequestDto`, `LogoutRequestDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `ChangePasswordDto`. |
| **Entities** | `User` (id, email, passwordHash, roleId, isActive, failedLoginAttempts, lockedUntil, lastLoginAt, mustChangePassword). `RefreshToken` (id, userId, tokenHash, expiresAt, revokedAt, replacedById). `PasswordResetToken` (id, userId, tokenHash, expiresAt, usedAt). |
| **Middleware** | Global RateLimit tightened on `/auth/login` and `/auth/forgot-password` (per-IP + per-account) to blunt credential stuffing. |
| **Policies** | `CanChangeOwnPassword` (self). Password-reset endpoints are unauthenticated but token-gated. |
| **Validators** | `StrongPasswordValidator` (length, character classes, breach-list check). Email format. Reject login when `lockedUntil > now()` with the same 401 response as bad password (no lockout oracle). |
| **Events** | `UserLoggedIn`, `UserLoggedOut`, `LoginFailed`, `AccountLocked`, `PasswordChanged`, `PasswordResetRequested`. All consumed by AuditModule; `AccountLocked` and `PasswordChanged` also consumed by NotificationModule. |
| **Queues** | Publishes to NotificationModule's `notification-dispatch` queue via events; owns no queue itself. |
| **Cron Jobs** | `ExpiredRefreshTokenCleanupJob` — daily, hard-delete refresh tokens past retention. `ExpiredResetTokenCleanupJob` — hourly. `AccountAutoUnlockJob` — every 5 min, clear `lockedUntil` for expired locks (defence in depth; login path also lazy-clears). |

## 2. RbacModule — Roles, permissions, authorization primitives

Owns role/permission data and the guards + policy base class other modules
plug into. Role/permission set is seeded, not user-editable at runtime
(arch §10.3).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `RbacController` (read-only) — `GET /rbac/roles`, `GET /rbac/permissions`, `GET /rbac/me/permissions`. |
| **Services** | `RbacService` — `getUserPermissions(userId)`, `checkPermission(userId, permission)`, `listRoles`, `listPermissions`. `PermissionResolver` — Redis-backed cache with invalidation on role change. |
| **Repositories** | `RoleRepository`, `PermissionRepository`, `RolePermissionRepository`. |
| **DTOs** | `RoleDto`, `PermissionDto`, `UserPermissionsDto`. |
| **Entities** | `Role`, `Permission`, `RolePermission` (join). `User.roleId` FK lives on the User entity in AuthModule. |
| **Middleware** | — (RBAC runs at the guard layer, not middleware). |
| **Policies** | Exposes the `Policy` base interface (`can(user, action, resource) → boolean \| Reason`) and the `PolicyRegistry` other modules register against. |
| **Validators** | — |
| **Events** | `UserRoleChanged` (emitted by AdminUserController when SA changes a user's role) — invalidates PermissionResolver cache. |
| **Queues** | — |
| **Cron Jobs** | `PermissionCacheRefreshJob` — every 5 min, fallback rebuild of the Redis permission cache to survive missed invalidations. |

## 3. EmployeeModule — People / HR-side records

Distinct from `User` (an account with credentials); an Employee is the
person the business tracks, may or may not have a login.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `EmployeeController` — `GET /employees`, `GET /employees/:id`, `POST /employees`, `PUT /employees/:id`, `PATCH /employees/:id/status`, `GET /employees/:id/assets`, `GET /employees/:id/history`. |
| **Services** | `CreateEmployeeUseCase`, `UpdateEmployeeUseCase`, `ChangeEmploymentStatusUseCase` (emits the event that triggers WF-4 return auto-drafting), `GetEmployeeUseCase`, `ListEmployeesUseCase` (filters, pagination). |
| **Repositories** | `EmployeeRepository`. Assigned-assets and history views are derived via cross-module reads (AssetModule and AuditModule read APIs). |
| **DTOs** | `CreateEmployeeDto`, `UpdateEmployeeDto`, `ChangeEmploymentStatusDto`, `EmployeeListItemDto`, `EmployeeDetailDto`. |
| **Entities** | `Employee` (id, employeeCode, firstName, lastName, email, departmentId, designation, managerId, officeId, employmentStatus, userId?, startDate, endDate). |
| **Middleware** | — |
| **Policies** | `CanCreateEmployee` (SA, PC). `CanEditEmployee` (SA, PC). `CanViewEmployee` (SA, PC, ST, IT; Employee self only via row-scope filter). `CanChangeEmploymentStatus` (SA, PC). |
| **Validators** | Employee code unique. Email unique. `NoManagerCycleValidator` — walks the manager chain to reject cycles or self-management. Department and office must exist. |
| **Events** | `EmployeeCreated`, `EmployeeUpdated`, `EmploymentStatusChanged` (→ ReturnModule auto-draft per WF-4; NotificationModule; AuditModule). |
| **Queues** | — |
| **Cron Jobs** | — |

## 4. AssetModule — Asset registry (the core inventory aggregate)

Owns the Asset aggregate (Asset + Accessories + StatusHistory). Direct
status writes are restricted to Super Admin and flagged as bypass; normal
status changes come from workflow completion events.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AssetController` — `GET /assets`, `GET /assets/:id`, `GET /assets/tag/:tag`, `POST /assets`, `PUT /assets/:id`, `PATCH /assets/:id/status` (SA-only bypass), `GET /assets/:id/history`, `GET /assets/:id/qr`, `GET /assets/:id/barcode`. |
| **Services** | `RegisterAssetUseCase`, `UpdateAssetUseCase`, `ChangeAssetStatusUseCase` (guards asset-lifecycle state machine per arch §8.6), `GetAssetHistoryUseCase`. Domain services: `AssetTagGenerator` (unique tag per pattern), `AssetLifecycleStateMachine` (Available ↔ Reserved ↔ Allocated ↔ Under Repair ↔ Returned ↔ Disposed / Lost / Stolen / Unaccounted). Infrastructure: `BarcodeService` (bwip-js), `QrCodeService`. |
| **Repositories** | `AssetRepository` (aggregate load: asset + accessories), `AssetAccessoryRepository`, `AssetStatusHistoryRepository` (append-only interface — no update/delete). |
| **DTOs** | `CreateAssetDto` (with nested accessories), `UpdateAssetDto`, `ChangeStatusDto` (reason required), `AssetListItemDto`, `AssetDetailDto` (with current holder, accessories, status history summary). |
| **Entities** | `Asset` (aggregate root), `AssetAccessory`, `AssetStatusHistory`. Value objects: `AssetTag`, `SerialNumber`, `IMEI`, `Money` (purchase amount + currency). |
| **Middleware** | — |
| **Policies** | `CanCreateAsset` (SA, ST). `CanEditAsset` (SA, ST). `CanDirectSetStatus` (SA only — logs a `WorkflowBypassed` event). `CanViewAsset` (all roles; Employees see own via row-scope). |
| **Validators** | AssetTag unique. SerialNumber unique per DeviceType. IMEI unique when present. Warranty expiry ≥ purchase date. Purchase amount ≥ 0. Lifecycle transitions must be legal per state machine. |
| **Events** | `AssetRegistered`, `AssetUpdated`, `AssetStatusChanged` (→ SearchModule reindex, Dashboard cache invalidate), `AssetAllocated`, `AssetReturnedToInventory`, `AssetSentToRepair`, `AssetDisposed`, `AssetLostReported`, `AssetStolenReported`, `AssetRecovered`. |
| **Queues** | Publishes to `search-reindex` queue on asset changes. |
| **Cron Jobs** | `WarrantyExpiryReminderJob` — daily 07:00; notifies Stores/IT at 60/30/7-day thresholds. `StaleReservationReleaseJob` — every 15 min; releases `Reserved` status past its TTL back to `Available` (E-6 race path). |

## 5. VendorModule — Supplier master data

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `VendorController` — CRUD + `GET /vendors/:id/contracts`, `GET /vendors/:id/assets`. |
| **Services** | `CreateVendorUseCase`, `UpdateVendorUseCase`, `DeactivateVendorUseCase` (soft-deactivate; never hard-delete when referenced). |
| **Repositories** | `VendorRepository`. |
| **DTOs** | `CreateVendorDto`, `UpdateVendorDto`, `VendorResponseDto`. |
| **Entities** | `Vendor` (id, name, category, contactName, email, phone, address, contractExpiry, isActive). |
| **Middleware** | — |
| **Policies** | `CanManageVendors` (SA, ST). `CanViewVendors` (SA, ST, IT). |
| **Validators** | Vendor name unique. Contact email format. `ReferentialIntegrityValidator` — reject deactivation if referenced by active acquisitions or open repairs. |
| **Events** | `VendorCreated`, `VendorUpdated`, `VendorDeactivated`. |
| **Queues** | — |
| **Cron Jobs** | `VendorContractExpiryReminderJob` — weekly Monday 07:00; notifies at 60/30/7-day thresholds. |

## 6. MasterDataModule — Departments, Offices, Device Types, Brands

Reference data that keeps business rules out of code (BR-2.3).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | One controller per entity (`DepartmentController`, `OfficeController`, `DeviceTypeController`, `BrandController`) — CRUD each. |
| **Services** | One use case per (create/update/deactivate) per entity, or a small generic `MasterDataUseCase<T>` if the shapes prove interchangeable. `MasterDataCacheService` — Redis-cached lookups (hot path for asset creation, allocation forms). |
| **Repositories** | One repository per entity. |
| **DTOs** | `CreateXDto`, `UpdateXDto`, `XResponseDto` per entity. |
| **Entities** | `Department`, `Office`, `DeviceType`, `Brand`. All soft-deactivatable, never hard-deleted when referenced. |
| **Middleware** | — |
| **Policies** | `CanManageMasterData` (SA). `CanReadMasterData` (all authenticated). |
| **Validators** | Name unique per entity type. Reject deactivation while referenced by active records. |
| **Events** | `MasterDataItemCreated`, `MasterDataItemUpdated`, `MasterDataItemDeactivated` — all invalidate MasterDataCacheService. |
| **Queues** | — |
| **Cron Jobs** | `MasterDataCacheRefreshJob` — every 15 min, safety refresh. |

## 7. AcquisitionModule — Purchase capture

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AcquisitionController` — `POST /acquisitions`, `GET /acquisitions`, `GET /acquisitions/:id`. |
| **Services** | `RegisterAcquisitionUseCase` — creates the acquisition record and one or more assets (in `Registration` status) inside a single transaction; delegates asset creation to AssetModule's public service to preserve encapsulation. |
| **Repositories** | `AcquisitionRepository`. |
| **DTOs** | `CreateAcquisitionDto` (with nested asset detail array), `AcquisitionResponseDto`. |
| **Entities** | `Acquisition` (id, vendorId, invoiceNumber, purchaseDate, purchaseAmount, facilitatedByUserId, notes). |
| **Middleware** | — |
| **Policies** | `CanCreateAcquisition` (SA, ST). `CanViewAcquisitions` (SA, ST, PC). |
| **Validators** | Invoice number unique per vendor per year. Purchase amount > 0. Purchase date not in future. At least one asset detail present. |
| **Events** | `AcquisitionCreated` (→ AuditModule). |
| **Queues** | — |
| **Cron Jobs** | — |

## 8. WorkflowModule — The state-machine engine

The heart of the system. Every business workflow (Allocation, Return,
Assessment routing, Disposal approval) is a `WorkflowInstance` running on
a `WorkflowDefinition` this module loads and evaluates. See arch §8–9.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `WorkflowController` — `GET /workflows/definitions`, `GET /workflows/definitions/:id`, `GET /workflows/instances/:id`, `POST /workflows/instances/:id/transition`, `POST /workflows/instances/:id/bypass` (SA only). `WorkflowConfigController` (admin) — CRUD on definitions/stages/SLAs. |
| **Services** | `TransitionUseCase` — the single transaction boundary for a state change: row-locks the instance, calls engine, persists transition, emits events. `CreateInstanceUseCase`, `BypassUseCase`. Domain services: `WorkflowEngine` (pure — given definition + current state + proposed target, returns Allow/Deny with reason), `SignatureCollector`, `SLAEvaluator`. |
| **Repositories** | `WorkflowDefinitionRepository`, `WorkflowStageRepository`, `WorkflowInstanceRepository` (aggregate: instance + transitions, loaded with pessimistic lock for writes), `WorkflowTransitionRepository` (append-only), `SLADefinitionRepository`. |
| **DTOs** | `CreateInstanceDto`, `TransitionDto` (fromState, toState, comment, signature, evidenceFileIds), `BypassDto` (reason, evidence), `WorkflowDefinitionDto`, `WorkflowInstanceDto`, `StageDto`. |
| **Entities** | `WorkflowDefinition`, `WorkflowStage`, `WorkflowInstance` (aggregate root), `WorkflowTransition` (child), `SLADefinition`. Value objects: `Signature`, `TransitionOutcome`. |
| **Middleware** | — |
| **Policies** | `CanTransitionAtStage(user, instance, targetState)` — resolves the stage's required role and returns Deny with reason if mismatched. `CanBypassWorkflow` (SA only). `CanConfigureWorkflows` (SA). |
| **Validators** | Proposed transition edge exists in the definition graph. All required signatures + evidence attached for the target stage. Instance not already terminated. Row-lock acquired before write (concurrency — R-10). |
| **Events** | `WorkflowInstanceCreated`, `StageEntered`, `StageCompleted`, `WorkflowCompleted`, `WorkflowBypassed`, `SLABreached`. All go through the durable outbox. |
| **Queues** | `workflow-notification-fanout` — on `StageEntered`, dispatches the "you have a pending action" notification to every user in the next stage's role. `sla-timer` — delayed jobs scheduled per stage entry; fires `SLABreached` when the stage is still open at threshold. `outbox-relay` — polls the event outbox and hands events to subscribers. |
| **Cron Jobs** | `SLAScannerJob` — every 5 min, safety-net scan for breaches missed by delayed jobs (e.g., after a Redis restart). `StaleInstanceReminderJob` — daily 08:00, escalates instances stuck past threshold via ComplianceModule. |

## 9. AllocationModule — Employee → asset allocation workflow

The 8-stage allocation process (BR-8). Delegates state mechanics to
WorkflowModule; owns request-specific data.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AllocationController` — `POST /allocations` (submit request), `GET /allocations`, `GET /allocations/:id`, `POST /allocations/:id/select-asset` (Stores), `POST /allocations/:id/assessment` (creates the assessment instance for IT), `POST /allocations/:id/sign` (per role), `GET /allocations/pending/:role`. |
| **Services** | `SubmitAllocationRequestUseCase`, `SelectAssetUseCase` (reserves asset in `Reserved` status with TTL), `AttachAssessmentUseCase`, `SignAllocationUseCase`, `ListPendingAllocationsUseCase`. |
| **Repositories** | `AllocationRequestRepository`. |
| **DTOs** | `SubmitAllocationRequestDto` (requestType ∈ {NewDevice, Repair, Replacement, AdditionalDevice, Accessory}, justification, requestedDeviceTypeId, requestedSpec), `SelectAssetDto` (assetId), `SignAllocationDto`, `AllocationResponseDto`, `AllocationListItemDto`. |
| **Entities** | `AllocationRequest` (id, requesterEmployeeId, requestType, workflowInstanceId, selectedAssetId?, assessmentRecordId?, justification, priorityId). |
| **Middleware** | — |
| **Policies** | `CanSubmitAllocation` (any authenticated Employee). `CanReviewAllocation` (PC). `CanSelectAsset` (ST). `CanAssessForAllocation` (IT). `CanSignAsRequester` (requester self only). `CanSignAsPC` (PC). `CanSignAsIT` (IT). |
| **Validators** | Request type in allowed set. Justification length ≥ configured minimum. `NoConflictingActiveRequestValidator` — reject a second in-flight allocation for the same requester + type (WF-2). Selected asset must be `Available` at row-lock time; failure returns a specific conflict code so UI can prompt for reselection. |
| **Events** | `AllocationRequested`, `AllocationApproved`, `AssetSelectedForAllocation`, `AssessmentRequestedForAllocation`, `AllocationSignedByEmployee`, `AllocationSignedByPC`, `AllocationSignedByIT`, `AllocationCompleted` (→ AssetModule flips asset to `Allocated`; NotificationModule confirms to employee). |
| **Queues** | Uses WorkflowModule queues. |
| **Cron Jobs** | — (SLA handled by WorkflowModule). |

## 10. ReturnModule — Return workflow

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `ReturnController` — `POST /returns` (initiate), `GET /returns`, `GET /returns/:id`, `POST /returns/:id/items` (item-level capture), `POST /returns/:id/sign`, `POST /returns/:id/complete`. |
| **Services** | `InitiateReturnUseCase`, `AutoDraftReturnOnEmploymentEndUseCase` (event-driven, per WF-4), `RecordReturnedItemsUseCase`, `SignReturnUseCase`, `CompleteReturnUseCase`, `ReportLostOrStolenUseCase` (E-3 direct transition path). |
| **Repositories** | `ReturnRecordRepository` (aggregate: record + items), `ReturnItemRepository`. |
| **DTOs** | `InitiateReturnDto` (reason ∈ {Resignation, Termination, Transfer, Replacement, Repair, Lost, Other}, employeeId, assetIds, expectedReturnDate), `RecordItemsDto` (per item: status ∈ {Returned, Missing, Damaged}, notes, photoFileIds), `SignReturnDto`, `ReturnResponseDto`. |
| **Entities** | `ReturnRecord` (aggregate root), `ReturnItem` (per asset/accessory). |
| **Middleware** | — |
| **Policies** | `CanInitiateReturn` (SA, PC, or Employee for own asset). `CanReceiveReturn` (ST). `CanAssessReturn` (IT). `CanSignReturn` (per role at that stage). |
| **Validators** | Reason from allowed set. Each `ReturnItem` references an actual accessory of the returned asset. Damage/Missing require note. Photos required when damage flagged. |
| **Events** | `ReturnInitiated`, `ReturnItemsRecorded`, `ReturnSignedByEmployee`, `ReturnSignedByPC`, `ReturnCompleted` (→ AssetModule flips asset: `Available` on pass, `Under Repair` on repair-needed, `Unaccounted` on missing), `LostAssetReported`, `StolenAssetReported`. |
| **Queues** | Uses WorkflowModule queues. Subscribes to `EmploymentStatusChanged` from EmployeeModule via event bus. |
| **Cron Jobs** | `StaleReturnDraftEscalationJob` — daily; escalates return records whose expected return date has passed. |

## 11. AssessmentModule — 23-point device assessment

Runs as part of allocation (pre-assignment) or return (post-recovery).
Outcome routes the parent workflow (WF-8).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AssessmentController` — `POST /assessments`, `GET /assessments`, `GET /assessments/:id`, `POST /assessments/:id/complete`, `GET /assets/:assetId/assessments`. |
| **Services** | `CreateAssessmentUseCase`, `CompleteAssessmentUseCase`. Domain services: `ChecklistScorer` (computes recommended outcome from the 23 item results — advisory; the IT rep confirms), `OutcomeRouter` (produces the event that advances the host workflow: Pass → continue, Repair → RepairModule, Replace → new allocation, Reject → DisposalModule). |
| **Repositories** | `AssessmentRecordRepository` (aggregate: record + items), `AssessmentChecklistItemRepository`. |
| **DTOs** | `CreateAssessmentDto` (assetId, workflowContextId), `CompleteAssessmentDto` (23 item results + outcome + technician notes + optional supervisor comment), `AssessmentResponseDto`. |
| **Entities** | `AssessmentRecord` (aggregate root), `AssessmentChecklistItem`. |
| **Middleware** | — |
| **Policies** | `CanCreateAssessment` (IT, ST). `CanCompleteAssessment` (IT). `CanViewAssessment` (SA, ST, IT, PC). |
| **Validators** | All 23 checklist items answered (`Pass \| Fail \| N/A`). Outcome present. Repair/Replace outcome requires technician note. Reject requires supervisor comment (segregation). |
| **Events** | `AssessmentCreated`, `AssessmentCompleted` (with outcome — consumed by WorkflowModule, RepairModule, DisposalModule per routing). |
| **Queues** | Uses WorkflowModule queues. |
| **Cron Jobs** | — |

## 12. RepairModule — Repair tracking

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `RepairController` — `POST /repairs`, `GET /repairs`, `GET /repairs/:id`, `PATCH /repairs/:id/status`, `POST /repairs/:id/complete`. |
| **Services** | `CreateRepairUseCase` (captures warranty snapshot at time of repair per E-9), `UpdateRepairStatusUseCase`, `CompleteRepairUseCase`. Domain service: `WarrantySnapshotResolver`. |
| **Repositories** | `RepairRepository`. |
| **DTOs** | `CreateRepairDto` (assetId, faultDescription, technicianUserId, vendorId, estimatedCost, priority), `UpdateRepairStatusDto`, `CompleteRepairDto` (actualCost, completionDate, resolutionNotes, outcome ∈ {Repaired, Unrepairable, PartiallyRepaired}), `RepairResponseDto`. |
| **Entities** | `RepairRecord` (id, assetId, workflowInstanceId, faultDescription, technicianUserId, vendorId, estimatedCost, actualCost, warrantyStatusAtRepair, startedAt, completedAt, outcome). |
| **Middleware** | — |
| **Policies** | `CanCreateRepair` (IT, ST). `CanUpdateRepairStatus` (IT, assigned technician). `CanCompleteRepair` (IT). |
| **Validators** | `actualCost ≥ 0`. `completionDate ≥ startedAt`. Warranty snapshot recorded on create. Outcome-consistent notes (Unrepairable → forces DisposalModule handoff). |
| **Events** | `RepairCreated` (→ AssetModule flips asset to `Under Repair`), `RepairStatusChanged`, `RepairCompleted` (→ AssetModule flips to `Available` on Repaired, hands off to DisposalModule on Unrepairable). |
| **Queues** | Uses WorkflowModule queues. |
| **Cron Jobs** | `OverdueRepairEscalationJob` — daily; escalates repairs past estimated completion via ComplianceModule. |

## 13. DisposalModule — Asset end-of-life + recovery correction

Disposed assets are never deleted; a recovery path (SA-only) reverses a
mistaken disposal with full history preserved (WF-6).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `DisposalController` — `POST /disposals`, `GET /disposals`, `GET /disposals/:id`, `POST /disposals/:id/approve`, `POST /disposals/:id/reject`, `POST /disposals/:id/recover`. |
| **Services** | `RequestDisposalUseCase`, `ApproveDisposalUseCase` (enforces approver ≠ requester), `RejectDisposalUseCase`, `RecoverAssetUseCase`. |
| **Repositories** | `DisposalRepository`. |
| **DTOs** | `RequestDisposalDto` (assetId, reason, method, evidenceFileIds), `ApproveDisposalDto` (signature), `RecoverAssetDto` (recoveryReason, evidenceFileIds), `DisposalResponseDto`. |
| **Entities** | `DisposalRecord` (id, assetId, requesterId, approverId?, reason, method, evidenceFileIds, status ∈ {Requested, Approved, Rejected, Recovered}, timestamps, workflowInstanceId). |
| **Middleware** | — |
| **Policies** | `CanRequestDisposal` (SA, ST). `CanApproveDisposal` (SA; approver ≠ requester). `CanRecoverDisposed` (SA only). |
| **Validators** | Reason from allowed set. Evidence upload required. Asset not already terminally disposed. Approver ≠ requester (segregation of duties). |
| **Events** | `DisposalRequested`, `DisposalApproved` (→ AssetModule flips asset to `Disposed`), `DisposalRejected`, `AssetRecovered` (→ AssetModule restores prior status; history preserved). |
| **Queues** | Uses WorkflowModule queues. |
| **Cron Jobs** | — |

## 14. AuditModule — Append-only event log

Immutability enforced at the interceptor, repository, and DB level
(arch §12.3). See arch §12 for hash-chain integrity.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `AuditController` (read-only, SA) — `GET /audit-logs`, `GET /audit-logs/:id`, `GET /audit-logs/entity/:type/:id`. Export handled via ReportModule. |
| **Services** | `AuditService.log(...)` (the only write path; used by AuditInterceptor and by explicit domain-event handlers). `AuditQueryService` (filter, paginate, diff). `HashChainVerifier` (recomputes rolling hash to detect tamper). |
| **Repositories** | `AuditLogRepository` — write-only interface (`append`) and read-only interface (`find`, `stream`). Repository implementation rejects `update`/`delete` calls at compile time (missing methods) and at runtime (DB permissions). |
| **DTOs** | `AuditLogResponseDto` (with `oldValue`/`newValue` diff render), `AuditQueryDto` (dateRange, userId, entityType, action). |
| **Entities** | `AuditLogEntry` (id, userId, action, entityType, entityId, oldValue jsonb, newValue jsonb, ip, correlationId, occurredAt, chainHash). |
| **Middleware** | `AuditContextMiddleware` — populates `AsyncLocalStorage` used by domain writes to attribute the actor without threading it through repositories. |
| **Policies** | `CanViewAuditLogs` (SA only). No write policy — writes are internal, not exposed via API. |
| **Validators** | Repository-level rejection of update/delete. DB-level: the audit table role has INSERT+SELECT only (no UPDATE/DELETE grant). |
| **Events** | Subscribes to essentially every domain event as a fallback path; the primary path is `AuditInterceptor` capturing state-changing HTTP calls with before/after snapshots. |
| **Queues** | `audit-write` — buffered async writes to keep the request hot path fast. At-least-once with idempotency key = `(correlationId, action, entityId)`. |
| **Cron Jobs** | `AuditHashChainVerificationJob` — daily 02:00; recomputes the rolling hash over recent entries and alerts SA on mismatch. `AuditArchiveJob` — monthly; moves entries past retention window to cold storage. Never deletes. |

## 15. NotificationModule — Email + in-app + digests

Subscribes to events across modules; owns delivery. No public write API.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `NotificationController` — `GET /notifications`, `POST /notifications/:id/mark-read`, `POST /notifications/mark-all-read`. `NotificationPreferenceController` — `GET /notification-preferences`, `PUT /notification-preferences`. |
| **Services** | `NotificationDispatcher` (event → resolve recipients → render → enqueue). `EmailSender` (Nodemailer adapter). `InAppNotificationSink` (persists in-app copy). `TemplateRenderer` (MJML/Handlebars). `DigestBuilder`. |
| **Repositories** | `NotificationRepository`, `NotificationPreferenceRepository`, `EmailTemplateRepository`. |
| **DTOs** | `NotificationResponseDto`, `NotificationPreferenceDto`, `PreferenceUpdateDto`. |
| **Entities** | `Notification` (id, userId, type, subject, body, entityRef, readAt, sentAt), `NotificationPreference` (userId, notificationType, channel, frequency ∈ {immediate, daily, weekly, off}), `EmailTemplate` (key, subject, body, locale). |
| **Middleware** | — |
| **Policies** | `CanReadOwnNotifications` (self). `CanManageOwnPreferences` (self). |
| **Validators** | Frequency in allowed set. Channel in allowed set. Preference resolves against a defined `NotificationType`. |
| **Events** | Subscribes to: essentially every allocation/return/assessment/repair/disposal/SLA event plus `PasswordChanged`, `AccountLocked`, `EmployeeCreated`. Emits `NotificationSent`, `NotificationFailed` (→ retry logic). |
| **Queues** | `notification-dispatch` — main outbound queue (email + in-app persistence); retry with exponential backoff; dead-letter after N attempts. `digest-build` — scheduled aggregation jobs. `notification-retry` — DLQ handler surfaces failures to SA. |
| **Cron Jobs** | `DailyDigestJob` — 08:00 tenant-local; builds and enqueues digests for `frequency=daily` users. `WeeklyDigestJob` — Mondays 08:00 for `frequency=weekly`. `NotificationRetryJob` — hourly; retries entries in the DLQ up to the retry cap. |

## 16. ComplianceModule — SLA breach detection + escalation

Consumes `SLABreached` and `WorkflowBypassed`; drives escalation up
the management chain and populates the Compliance dashboard.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `ComplianceController` — `GET /compliance/breaches`, `GET /compliance/breaches/:id`, `GET /compliance/escalations`, `POST /compliance/breaches/:id/acknowledge`, `GET /compliance/sla-config`, `PUT /compliance/sla-config`. |
| **Services** | `ComplianceService`, `EscalationDispatcher` (walks the Employee manager chain per breach severity), `AcknowledgeBreachUseCase`. Domain service: `SLABreachEvaluator`. |
| **Repositories** | `ComplianceBreachRepository`, `EscalationLogRepository`. |
| **DTOs** | `ComplianceBreachDto`, `EscalationLogDto`, `SLAConfigDto`, `AcknowledgeBreachDto`. |
| **Entities** | `ComplianceBreach` (id, workflowInstanceId, stageId, breachType, openedAt, severity, acknowledgedBy?, acknowledgedAt, resolvedAt?), `EscalationLog` (id, breachId, level, escalatedToUserId, sentAt, ackAt?). |
| **Middleware** | — |
| **Policies** | `CanViewCompliance` (SA, PC). `CanConfigureSLA` (SA). `CanAcknowledgeBreach` (SA, PC). |
| **Validators** | SLA threshold > 0. Escalation levels ordered ascending. Configured recipient roles exist. |
| **Events** | Subscribes: `SLABreached`, `WorkflowBypassed`. Emits: `EscalationSent`, `BreachAcknowledged`, `BreachResolved`. |
| **Queues** | Publishes escalation emails via NotificationModule queue. |
| **Cron Jobs** | `ComplianceSweepJob` — hourly; re-evaluates open breaches and fires the next escalation level when the interval elapses. `EscalationChainJob` — daily 09:00; walks unaddressed breaches up the manager chain per severity table. |

## 17. ReportModule — 8 report types, PDF/Excel/CSV export

Reports are asynchronous: the request enqueues a job that generates the
file and stores it in FileStorage; the client polls or receives a
notification when ready (long-running).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `ReportController` — `POST /reports/:type/generate`, `GET /reports/:id`, `GET /reports/:id/download`, `GET /reports/templates`. |
| **Services** | `ReportService` (facade). One generator per report type: `InventoryReportGenerator`, `AllocationReportGenerator`, `ReturnReportGenerator`, `RepairReportGenerator`, `DisposalReportGenerator`, `DepartmentReportGenerator`, `EmployeeAssetHistoryReportGenerator`, `ComplianceReportGenerator`. `ExportFormatter` (PDF via Puppeteer, XLSX via ExcelJS, CSV). |
| **Repositories** | `ReportRunRepository` (records the request + status + resulting file reference). Generators read via other modules' public services — no cross-module DB reads. |
| **DTOs** | `GenerateReportDto` (type, filters, format), `ReportRunResponseDto` (id, status ∈ {Queued, Running, Complete, Failed}, downloadUrl, expiresAt). |
| **Entities** | `ReportRun` (id, requestedByUserId, type, filters jsonb, status, fileRef?, generatedAt?, expiresAt, error?). |
| **Middleware** | Route-level throttle on `POST /reports/:type/generate` (report generation is expensive). |
| **Policies** | `CanGenerateReport(type)` — per-type role matrix (Compliance report is SA+PC only, etc.). `CanViewReportRun` (requester + SA). |
| **Validators** | Type in allowed set. Filter dates within allowed range (some reports capped at 12 months). Format ∈ {PDF, XLSX, CSV}. |
| **Events** | `ReportRequested`, `ReportGenerated`, `ReportFailed`. |
| **Queues** | `report-generation` — long-running (may run minutes); each job pulls data, renders, uploads via FileStorageModule, updates the ReportRun row, notifies the requester. |
| **Cron Jobs** | `ExpiredReportFileCleanupJob` — daily; deletes report files past retention (default 30 days) and marks the ReportRun row expired. |

## 18. SearchModule — Global search

Cross-entity search over Asset, Employee, Vendor. Row-scoped by role at
query time (Employees only see their own assets).

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `SearchController` — `GET /search?q=` (global), `GET /search/assets`, `GET /search/employees`, `GET /search/vendors`. |
| **Services** | `GlobalSearchUseCase` (fan-out to per-type search), `AssetSearchUseCase`, `EmployeeSearchUseCase`, `VendorSearchUseCase`. `QueryNormalizer` (asset tag / serial / IMEI detection). `SearchIndexBuilder` (event-driven reindex). |
| **Repositories** | `SearchIndexRepository` — Postgres full-text over materialized `search_index` table (or `tsvector` columns on live tables; decision at M1). |
| **DTOs** | `SearchQueryDto` (`q`, `type?`, `page`, `pageSize`), `SearchResultsDto` (grouped by entity type with per-group counts and hits). |
| **Entities** | `SearchIndexEntry` (if materialized: id, entityType, entityId, tsv, updatedAt). |
| **Middleware** | Route-level throttle (§17.3 arch mentions Global Search FTS cost). |
| **Policies** | `CanSearchGlobally` (any authenticated). Results filtered per role at query time. |
| **Validators** | Query length ≥ 2. |
| **Events** | Subscribes to `AssetRegistered/Updated`, `EmployeeCreated/Updated`, `VendorCreated/Updated` and enqueues reindex. |
| **Queues** | `search-reindex` — debounced/batched reindex; throttle keeps hot writes cheap. |
| **Cron Jobs** | `SearchIndexRebuildJob` — weekly Sunday 02:00; full rebuild for drift correction. |

## 19. FileStorageModule — Evidence + attachment storage

Backed by S3-compatible object storage (arch §2). Every file has an owning
entity reference so orphan cleanup is possible.

| Layer | Components & Responsibilities |
|---|---|
| **Controllers** | `FileController` — `POST /files/upload` (multipart), `GET /files/:id` (returns signed URL), `DELETE /files/:id`. |
| **Services** | `FileStorageService` (interface). `S3StorageService` (concrete for prod/staging), `LocalStorageService` (dev/tests). `FileValidator` (MIME + magic-byte + size + filename sanitization). `SignedUrlIssuer` (short-lived, per-file). |
| **Repositories** | `FileReferenceRepository`. |
| **DTOs** | `UploadResponseDto` (id, url, expiresAt), `FileMetadataDto`. |
| **Entities** | `FileReference` (id, ownerModule, ownerEntityType, ownerEntityId?, storageKey, mime, size, uploadedByUserId, uploadedAt, retentionUntil, scanStatus). |
| **Middleware** | `FileUploadRateLimiter` (per-user; stricter than global). |
| **Policies** | `CanUpload` (any authenticated within per-role quota). `CanRead` — deferred to the owning module's read policy on the referenced entity (a return-photo read requires ReturnModule permission on that return). `CanDelete` (SA + uploader within grace period). |
| **Validators** | MIME allow-list (JPEG/PNG/WebP/PDF). Size ≤ configured cap (default 10 MB). Magic-byte match against declared MIME. Filename sanitized (no path traversal). Retention duration ≥ minimum for evidence-class files. |
| **Events** | `FileUploaded`, `FileScanCompleted`, `FileDeleted`. |
| **Queues** | `image-thumbnail` — async thumbnail generation for photo evidence. `virus-scan` — ClamAV (or equivalent) scan on upload; the scan result gates the file's usable status. `orphan-cleanup` — batched delete of unreferenced files after grace period. |
| **Cron Jobs** | `OrphanFileCleanupJob` — nightly 03:00; finds files with `ownerEntityId IS NULL` older than grace period and hard-deletes. `ExpiredFileCleanupJob` — daily; hard-deletes files past `retentionUntil` (except audit-linked evidence which is retention-locked). |

---

## Cross-module event catalogue (reference)

Every event listed above uses the durable outbox (§0.5) when a subscriber
cannot tolerate loss. This table is the canonical list — modules must
publish these exact names; subscribers must match.

| Event | Publisher | Primary Subscribers |
|---|---|---|
| `UserLoggedIn` / `UserLoggedOut` / `LoginFailed` / `AccountLocked` | Auth | Audit, Notification (AccountLocked) |
| `PasswordChanged` / `PasswordResetRequested` | Auth | Audit, Notification |
| `UserRoleChanged` | AdminUser | Rbac (cache invalidate), Audit |
| `EmployeeCreated` / `EmployeeUpdated` | Employee | Audit, Notification, Search |
| `EmploymentStatusChanged` | Employee | Return (auto-draft), Notification, Audit |
| `AssetRegistered` / `AssetUpdated` / `AssetStatusChanged` | Asset | Search, Dashboard, Audit |
| `AssetAllocated` / `AssetReturnedToInventory` / `AssetSentToRepair` / `AssetDisposed` / `AssetRecovered` | Asset | Notification, Audit, Dashboard |
| `AssetLostReported` / `AssetStolenReported` | Return | Compliance, Notification, Audit |
| `VendorCreated` / `VendorUpdated` / `VendorDeactivated` | Vendor | Audit, Search |
| `MasterDataItemCreated` / `Updated` / `Deactivated` | MasterData | MasterDataCache, Audit |
| `AcquisitionCreated` | Acquisition | Asset, Audit |
| `WorkflowInstanceCreated` / `StageEntered` / `StageCompleted` / `WorkflowCompleted` | Workflow | Notification, Audit |
| `WorkflowBypassed` | Workflow | Compliance, Audit, Notification |
| `SLABreached` | Workflow | Compliance, Notification, Audit |
| `AllocationRequested` … `AllocationCompleted` | Allocation | Workflow, Notification, Audit |
| `ReturnInitiated` … `ReturnCompleted` | Return | Workflow, Asset, Notification, Audit |
| `AssessmentCreated` / `AssessmentCompleted` | Assessment | Workflow, Repair, Disposal, Audit |
| `RepairCreated` / `RepairStatusChanged` / `RepairCompleted` | Repair | Asset, Notification, Audit |
| `DisposalRequested` / `DisposalApproved` / `DisposalRejected` / `AssetRecovered` | Disposal | Asset, Notification, Audit |
| `NotificationSent` / `NotificationFailed` | Notification | (self, for retry) |
| `EscalationSent` / `BreachAcknowledged` / `BreachResolved` | Compliance | Notification, Audit |
| `ReportRequested` / `ReportGenerated` / `ReportFailed` | Report | Notification (Generated / Failed), Audit |
| `FileUploaded` / `FileScanCompleted` / `FileDeleted` | FileStorage | Audit, owning modules |

## Cross-module queue catalogue (reference)

| Queue | Owner | Producer(s) | Consumer |
|---|---|---|---|
| `notification-dispatch` | Notification | All modules (indirect via NotificationDispatcher) | Notification consumer worker |
| `digest-build` | Notification | `DailyDigestJob`, `WeeklyDigestJob` | Notification consumer worker |
| `notification-retry` | Notification | Notification consumer (on failure) | Notification consumer worker |
| `workflow-notification-fanout` | Workflow | Workflow (on `StageEntered`) | Notification bridge |
| `sla-timer` | Workflow | Workflow (on stage entry) | Workflow consumer (fires `SLABreached`) |
| `outbox-relay` | Common | All modules (via EventPublisher) | OutboxDispatcher |
| `audit-write` | Audit | AuditInterceptor, AuditService callers | Audit consumer worker |
| `search-reindex` | Search | Asset, Employee, Vendor events | Search consumer worker |
| `report-generation` | Report | `POST /reports/:type/generate` | Report generator worker |
| `image-thumbnail` | FileStorage | FileStorage (on upload of image MIME) | FileStorage worker |
| `virus-scan` | FileStorage | FileStorage (on upload) | FileStorage worker |
| `orphan-cleanup` | FileStorage | `OrphanFileCleanupJob` | FileStorage worker |

## Cross-module cron catalogue (reference)

| Job | Owner | Cadence | Purpose |
|---|---|---|---|
| `ExpiredRefreshTokenCleanupJob` | Auth | Daily 02:30 | Delete expired refresh tokens |
| `ExpiredResetTokenCleanupJob` | Auth | Hourly | Delete expired password-reset tokens |
| `AccountAutoUnlockJob` | Auth | Every 5 min | Clear expired lockouts |
| `PermissionCacheRefreshJob` | Rbac | Every 5 min | RBAC cache safety refresh |
| `WarrantyExpiryReminderJob` | Asset | Daily 07:00 | Warranty 60/30/7-day reminders |
| `StaleReservationReleaseJob` | Asset | Every 15 min | Release stale `Reserved` assets |
| `VendorContractExpiryReminderJob` | Vendor | Weekly Mon 07:00 | Contract expiry reminders |
| `MasterDataCacheRefreshJob` | MasterData | Every 15 min | Master-data cache safety refresh |
| `SLAScannerJob` | Workflow | Every 5 min | Safety-net SLA breach scan |
| `StaleInstanceReminderJob` | Workflow | Daily 08:00 | Escalate stuck workflow instances |
| `StaleReturnDraftEscalationJob` | Return | Daily 08:30 | Escalate overdue returns |
| `OverdueRepairEscalationJob` | Repair | Daily 08:30 | Escalate overdue repairs |
| `AuditHashChainVerificationJob` | Audit | Daily 02:00 | Tamper detection |
| `AuditArchiveJob` | Audit | Monthly 1st 03:00 | Cold-storage archive (never delete) |
| `DailyDigestJob` | Notification | Daily 08:00 | Build daily notification digests |
| `WeeklyDigestJob` | Notification | Weekly Mon 08:00 | Build weekly notification digests |
| `NotificationRetryJob` | Notification | Hourly | Retry DLQ entries |
| `ComplianceSweepJob` | Compliance | Hourly | Re-evaluate open breaches |
| `EscalationChainJob` | Compliance | Daily 09:00 | Walk breaches up manager chain |
| `ExpiredReportFileCleanupJob` | Report | Daily 03:30 | Delete expired report files |
| `SearchIndexRebuildJob` | Search | Weekly Sun 02:00 | Full FTS index rebuild |
| `OrphanFileCleanupJob` | FileStorage | Nightly 03:00 | Remove unreferenced files |
| `ExpiredFileCleanupJob` | FileStorage | Daily 04:00 | Delete files past retention |

---

## Notes on scope

- No `AdminUserModule` is broken out because user CRUD lives in
  AuthModule's admin surface (`AdminUserController`) — the module still
  owns the User entity.
- `Dashboard` is not a backend module. Dashboard reads assemble from
  existing module read APIs plus the CacheInterceptor.
- This document is the **implementation-time contract** between modules.
  Any new controller/service/event/queue/cron introduced during coding
  updates this document in the same commit as the code.
