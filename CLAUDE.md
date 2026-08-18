# IT Asset Management System — Codebase Guidelines

## Architecture Stack
- **Backend**: NestJS 10, TypeScript (strict), TypeORM 0.3, PostgreSQL, class-validator / class-transformer, EventEmitter2
- **Frontend**: React 18, Vite, Ant Design (antd) 5, TanStack Query, Zustand
- **Auth**: JWT (access + refresh), bcrypt, account lockout
- **Security**: Helmet, CORS, rate limiting (global + auth), RBAC guards
- **API docs**: `@nestjs/swagger`, served at `/api/docs` (configured in `main.ts`, deliberately outside `appConfig.apiPrefix`). Any new or changed controller endpoint/DTO must carry `@ApiOperation`/`@ApiResponse`/`@ApiParam`/`@ApiQuery`/`@ApiProperty` — treat undocumented endpoints as incomplete, not optional polish. `@Query()`-bound DTOs (e.g. `ListAssetsQuery`) need explicit `@ApiQuery(...)` on the controller method too; this project has no `@nestjs/swagger` CLI plugin, so query params are not auto-flattened from the DTO class.

Backend modules follow a hexagonal/clean-architecture layout — keep new modules consistent with it:

```
modules/<name>/
  domain/          # entities (private constructor + factory/hydrate), value-objects, domain services, repository interfaces, domain events
  application/      # use-cases (one class per operation), ports, orchestrates domain + repo + event publishing
  infrastructure/    # TypeORM entities (*.orm-entity.ts), repository implementations, external adapters
  presentation/       # controllers, DTOs, mappers
```

Domain and application layers must stay framework/DB-free — dependencies are bound through DI tokens (e.g. `ASSET_REPOSITORY`, `ID_GENERATOR`, `CLOCK`), not imported directly.

### Do NOT assume — this stack is fixed
This project does **not** use Next.js, the App Router, Prisma, Tailwind CSS, Shadcn UI, or Zod, and never has. Do not:
- Generate API routes as Next.js route handlers/`app/api/*` — this is a NestJS REST API under `packages/backend/src/modules/*/presentation`.
- Write or suggest Prisma schema/client code — the ORM is TypeORM; migrations live in `packages/backend/src/migrations`, entities in `*.orm-entity.ts`.
- Reach for Tailwind utility classes or Shadcn/Radix components — the UI is Ant Design (`antd`) in `packages/frontend`.
- Reach for Zod schemas — request validation is class-validator decorators on DTOs (`presentation/dto/*.dtos.ts`) + `ValidationPipe`.

If a request or an older doc/memory implies otherwise, treat this file as authoritative and flag the mismatch rather than silently switching stacks.

## Core Domain Rules & Drift Constraints

### Asset Tag Generation
Format: `AST-{YYYY}-{SEQ}`, sequence zero-padded to 5 digits (e.g. `AST-2026-00042`).
- Enforce via `AssetTagGenerator.build(year, sequence)` in `modules/asset/domain/services/asset-tag-generator.ts`. All manual creations and CSV/bulk imports MUST run through this generator/validator — never hand-format a tag string elsewhere.
- `AssetTagGenerator.PATTERN` (`^AST-(\d{4})-(\d{5,})$`) is the single source of truth for the format; use `AssetTagGenerator.isValid(tag)` to check it, `.parse()` to extract year/sequence.
- Caller-supplied tags are strictly validated against `PATTERN` before persisting, at both the HTTP boundary and the use-case: `CreateAssetDto.assetTag` (`@Matches(AssetTagGenerator.PATTERN)`) and `RegisterAssetUseCase`/`BulkImportAssetsUseCase` (`AssetTagGenerator.isValid()`, throwing/row-erroring `InvalidAssetTagFormatError` on mismatch). Any new path accepting a caller-supplied tag must do the same — don't add a path that trusts a caller-supplied tag verbatim.

### Unique Constraints
Enforced at the DB level in `migrations/1720300000000-AddAssetInventory.ts`:
- `asset_tag` — `UNIQUE` constraint, strictly enforced.
- `serial_number` — `UNIQUE` constraint, strictly enforced.
- `imei` — partial unique index (`WHERE imei IS NOT NULL`): multiple NULLs allowed, no two non-null imeis may collide.

`asset.orm-entity.ts` declares `@Index({ unique: true })` on `assetTag`/`serialNumber` and a matching named partial index (`@Index('uq_assets_imei_notnull', { unique: true, where: '"imei" IS NOT NULL' })`) on `imei`, kept in sync with the migration by name. If you touch this entity or add a new unique DB constraint, mirror it in both the migration and the entity decorator — don't let them drift again.

### Lifecycle State Machine
States: `Registration, Available, Reserved, Allocated, Returned, UnderRepair, Disposed, Lost, Stolen, Unaccounted`.

Transitions must strictly route through `AssetLifecycleStateMachine` (`modules/asset/domain/value-objects/asset-status.ts`), enforced in `Asset.changeStatus()` — never mutate `status` directly, never re-implement transition logic in a use-case or controller.

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

- `Disposed` is a terminal state. The only sanctioned exception is Super Admin recovery, restricted to the Disposal module's explicit recovery flow — do not add other bypasses or touch a `Disposed` asset via a direct status change.
- Invalid transitions must raise `InvalidAssetStatusTransitionError`; never swallow or silently coerce one.
- This IS how the codebase produces "proper NestJS exceptions": domain/application code throws a `DomainError`/`ApplicationError` subclass (never `@nestjs/common` exceptions — that would violate the framework-free domain/application layers above), and `GlobalExceptionFilter.mapDomainToStatus()` (`common/filters/global-exception.filter.ts`) maps the error `code` to the right HTTP status — `INVALID_ASSET_STATUS_TRANSITION` → 409 Conflict. Adding the HTTP status mapping there is the correct way to get a `BadRequestException`/`ConflictException`-equivalent response, not importing Nest exception classes into domain code.

### Audit Logging
Asynchronous via `EventEmitter2` and `@OnEvent` in `AuditService` — fire-and-forget; never block or fail primary DB transactions on audit write failures.
- Use-cases publish domain events via `EventPublisher.publish()` (`common/events/event-publisher.ts`), emitted in-process through `EventEmitter2` (no external queue/broker).
- `AuditService` (`modules/audit/application/audit.service.ts`) listens via `@OnEvent(...)` handlers per event type and writes the record.
- Audit write failures are caught and logged, never rethrown. Preserve this: don't add `await` chains that make a use-case's success depend on audit persistence succeeding.
- Record fields (`audit-log-entry.entity.ts`): `id, userId (actor), action, entityType, entityId, oldValue, newValue, ip, userAgent, correlationId, occurredAt`. Actor/ip/userAgent/correlationId come from async-local-storage request context (`common/utils/async-context.ts`) — don't thread them manually through use-case signatures.
- Every new state-changing use-case must emit a domain event with a corresponding `@OnEvent` handler in `AuditService`; a write path with no audit event is a bug.

### Device Assessment Checklist — reconciled to the real client form
The seeded `standard-device-assessment` template is **8 items** with **3 outcomes** (`NoFaultFound`/`RepairRecommended`/`ReplacementRecommended`), matching `DEVICE ASSESSMENT FORM.docx` exactly — verified directly against the primary source, not a paraphrase (see `docs/22-sapphire-virtual-source-data.md` §3). This reconciled an earlier 22-item / 4-outcome scheme (including a `Reject` outcome) that was built from a prompt summary before the real form was available — see `AddDeviceAssessment1720600000000` (original, historical) and `ReconcileDeviceAssessmentChecklist1721200000000` (the fix, in place for template v1 — no completed records existed yet to preserve a historical item set for). If you touch checklist items or outcomes again: `ChecklistScorer` (`modules/assessment/domain/services/checklist-scorer.ts`) hardcodes the 8 item codes and has no `Reject`-equivalent (a non-booting device now suggests `ReplacementRecommended`); `test/unit/assessment/fakes.ts`'s `buildStandardTemplate()` mirrors the seeded items for tests; and the frontend (`AssessmentDetailPage.tsx`, `assessments.api.ts`) has its own copy of the outcome union that must stay in lockstep since nothing generates it from the backend enum.

### Hardware Spec Validation & Seed Data
- `HardwareSpecValidator` (`modules/asset/domain/services/hardware-spec-validator.ts`) compares a device's `{cpuTier, ramGb, storageGb}` against a job **role level**'s minimum and returns soft warnings — it never throws, never blocks. Wired into `CompleteAssessmentRecordUseCase`, but **only fires when `AssessmentContextType.Allocation` and both `targetRoleLevel`/`deviceSpec` are supplied** — this is the "IT Technical Assessment" check for a device about to be allocated; other contexts (Standalone/Return/Repair) skip it entirely.
- Its default requirement table (`ROLE_LEVEL_SPEC_REQUIREMENTS`) is the **real, client-supplied** IT Hardware Specifications Matrix — see `docs/22-sapphire-virtual-source-data.md` §1 (supplied 2026-08-18, closing `GAP-01`). `Director` has no fixed minimum ("Executive Custom Request") and is intentionally `null` (no-op, not a failure).
- Keyed on `RoleLevel` (`Operative` → `Director`, matching the matrix), not `department` or `RoleName` — the system has no persisted job-role/seniority field anywhere (`RoleName` is access-control: SUPER_ADMIN/STORES_OFFICER/IT_REP/PEOPLE_CULTURE/EMPLOYEE, not job classification), so `targetRoleLevel` is caller-supplied at assessment-completion time, matching the real SOP ("IT matches the job role against the IT Hardware Specifications Matrix").
- `database/seeds/seed-full-inventory.ts` (`npm run seed:inventory:full`, or `seed:inventory:full:dry-run` to preview without writing) parses and seeds the **full real inventory** — all ~136 laptops + ~73 phones from `database/seeds/source-data/phone-and-laptop-update-2026-07-14.xlsx` (closes `GAP-19`'s "sample only" gap) via `database/seeds/lib/inventory-xlsx-parser.ts`. That source file is a real, messy spreadsheet — free-text status values ("CURRENTLY WITH TOYE", "YET TO BE RETURNED TO US BY ELIJAH"), serial numbers embedded in half a dozen delimiter styles in one column. The parser is deliberately conservative: every heuristic guess is flagged with a warning the script prints, and every imported asset's `notes` records the exact raw source fields it came from — never silently misrepresent a row as cleaner than the source actually was. `seed-initial-inventory.ts` (the earlier 8+4 sample) was retired and removed once this landed — it used a different, incompatible id scheme and would collide on `serial_number` if both were ever run against the same DB.

### Multi-Row Writes & Large Reads (bulk import / export)
- **Atomic multi-row writes**: `AssetRepository.withTransaction(work)` (`typeorm-asset.repository.ts`) opens a TypeORM `QueryRunner`, hands `work` a repository bound to that transaction, and commits on success / rolls back on throw. `BulkImportAssetsUseCase` uses this for its commit phase (`saveMany` + all `appendStatusHistory` calls) so a mid-batch failure leaves zero partial writes. Any new use-case writing more than one row in a single operation must go through `withTransaction`, not sequential unwrapped repository calls.
- **CSV import row validation**: every row is validated with the *same* class-validator schema style as `CreateAssetDto`, via `BulkImportRowDto` (`application/use-cases/bulk-import-row.dto.ts`) — don't reintroduce ad hoc manual field checks (e.g. a hand-rolled required-columns array) as a substitute for real schema validation.
- **dryRun never touches persistence**: dry-run mode only runs row validation + duplicate/uniqueness checks (intra-file and DB); it must never call `saveMany`/`appendStatusHistory`/`withTransaction`. If you add a new side effect to the commit path, gate it behind the same `!command.dryRun` check.
- **Large reads must stream, not accumulate**: `GET /assets/export` uses `AssetRepository.streamForExport()` (a TypeORM `.stream()` query, not paginated `.getManyAndCount()` calls) piped through `csv-stringify`'s Transform-stream API straight into the HTTP response (`csvStream.pipe(res)`). Don't go back to building a full in-memory array/string for a bulk export — that's exactly the memory blow-up this streaming path exists to avoid on large inventories. Requires the `pg-query-stream` package (TypeORM's Postgres driver loads it lazily for `.stream()`); it's a declared dependency, not optional.
