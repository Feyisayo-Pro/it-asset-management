# Frontend Implementation Plan

Design of the React frontend covering pages, layouts, routes,
feature-specific components, hooks, stores, context providers, the API
layer, state-management strategy, and folder structure.

Descriptions only — no code. This document is the coding-time contract
between UI files: every page in [`12-ui-design.md`](12-ui-design.md)
resolves to a page component here; every reusable primitive lives in
[`13-component-library.md`](13-component-library.md); every backend
endpoint in [`11-api-design.md`](11-api-design.md) is called through the
API layer defined here.

## Tech-stack recap (from `09-architecture.md` §2)

React 18 + TypeScript, built with **Vite** (fast dev server, native ESM,
good TS support). **React Router v6** for client-side routing.
**TanStack Query (React Query) v5** for server state. **Zustand** for
client state (chosen over Redux for smaller surface area on this size of
app; server state lives in Query, so cross-page client state is a
narrow slice). **Ant Design** (or Shadcn/ui — decision at M1) for the
primitive component set. **Recharts** for charts. **react-hook-form**
+ **zod** for forms and typed validation. **Axios** for HTTP with
interceptors.

The folder structure below extends the frontend section of
[`09-architecture.md`](09-architecture.md) §6.

---

## 1. Folder Structure

```
packages/frontend/
├── src/
│   ├── main.tsx                    # Vite entry — mounts <App/>
│   ├── App.tsx                     # Root: providers + <RouterProvider/>
│   │
│   ├── api/                        # HTTP client + typed endpoint modules
│   │   ├── client.ts               # Axios instance, interceptors, base URL
│   │   ├── error.ts                # Standard error mapping (arch §18.2 → UI errors)
│   │   ├── query-keys.ts           # Central TanStack Query key factory
│   │   ├── types/                  # Response/request DTO types (OpenAPI-generated at M1)
│   │   ├── auth.api.ts
│   │   ├── rbac.api.ts
│   │   ├── employees.api.ts
│   │   ├── assets.api.ts
│   │   ├── vendors.api.ts
│   │   ├── master-data.api.ts
│   │   ├── acquisitions.api.ts
│   │   ├── workflows.api.ts
│   │   ├── allocations.api.ts
│   │   ├── returns.api.ts
│   │   ├── assessments.api.ts
│   │   ├── repairs.api.ts
│   │   ├── disposals.api.ts
│   │   ├── audit.api.ts
│   │   ├── notifications.api.ts
│   │   ├── compliance.api.ts
│   │   ├── reports.api.ts
│   │   ├── search.api.ts
│   │   └── files.api.ts
│   │
│   ├── components/                 # Reusable primitives — see docs/13-component-library.md
│   │   ├── shell/                  # AppShell, TopBar, Sidebar, UserMenu, NotificationDropdown
│   │   ├── nav/                    # NavItem, NavGroup, Breadcrumb, PageHeader
│   │   ├── buttons/
│   │   ├── forms/                  # Form, FormField, TextInput, Select, DatePicker, SignatureBox, …
│   │   ├── tables/                 # DataTable, FilterBar, Pagination, ColumnPicker
│   │   ├── badges/                 # StatusBadge, RoleBadge, SLABadge, PriorityBadge, …
│   │   ├── cards/                  # StatCard, WorkflowCard, ApprovalCard, InfoCallout, …
│   │   ├── workflow/               # WorkflowStepper, StageCard, WorkflowActionBar, AssessmentChecklist, BypassBanner
│   │   ├── feedback/               # Modal, ConfirmModal, Drawer, Toast, Banner, Tooltip, Popover
│   │   ├── timeline/               # Timeline, TimelineEntry, ActivityFeed, AuditLogEntry, DiffView
│   │   ├── charts/                 # ChartContainer, BarChart, StackedBarChart, LineChart, DonutChart, Sparkline
│   │   ├── files/                  # FileUpload, FilePreview, PhotoGallery, AttachmentList, QRCodeDisplay, BarcodeDisplay, CopyButton
│   │   ├── states/                 # EmptyState, Skeleton, LoadingSpinner, ProgressBar, ErrorState, PermissionDenied
│   │   ├── identity/               # Avatar, AvatarStack, UserChip
│   │   └── layout-utils/           # Tabs, Divider, Stack, Grid, DetailPanel, ScrollShadow
│   │
│   ├── layouts/                    # Route-level frames (see §2)
│   │   ├── AppLayout.tsx           # Authenticated shell — Sidebar + TopBar + <Outlet/>
│   │   ├── AuthLayout.tsx          # Public — centered card frame for login / reset
│   │   ├── FullscreenLayout.tsx    # No shell (workflow signature capture, report viewer print)
│   │   ├── PrintLayout.tsx         # Print-optimized wrapper for report/PDF preview routes
│   │   └── ErrorLayout.tsx         # 403/404/500 pages
│   │
│   ├── features/                   # Feature-sliced, mirrors backend modules
│   │   ├── auth/
│   │   │   ├── pages/              # LoginPage, ForgotPasswordPage, ResetPasswordPage
│   │   │   ├── components/         # LoginForm, ChangePasswordForm
│   │   │   ├── hooks/              # useLogin, useLogout, useForgotPassword
│   │   │   └── schemas/            # zod schemas
│   │   ├── dashboard/
│   │   │   ├── pages/              # DashboardPage
│   │   │   ├── components/         # DashboardCounts, PendingApprovalsPanel, ActivityFeedPanel, AssetsByDepartmentChart, …
│   │   │   └── hooks/
│   │   ├── assets/
│   │   │   ├── pages/              # AssetListPage, AssetDetailPage, AssetCreatePage, AssetEditPage
│   │   │   ├── components/         # AssetForm, AssetHistoryTimeline, AssetAccessoriesTable, QrPrintPanel
│   │   │   ├── hooks/              # useAssets, useAsset, useCreateAsset, useUpdateAsset
│   │   │   └── schemas/
│   │   ├── employees/
│   │   ├── vendors/
│   │   ├── acquisitions/
│   │   ├── allocations/            # SubmitAllocationPage, AllocationListPage, AllocationDetailPage
│   │   ├── returns/
│   │   ├── assessments/
│   │   ├── repairs/
│   │   ├── disposals/
│   │   ├── notifications/          # NotificationCenter + Preferences
│   │   ├── compliance/
│   │   ├── reports/                # ReportsHub, ReportViewer
│   │   ├── search/                 # GlobalSearchResultsPage
│   │   ├── profile/                # UserProfilePage
│   │   └── admin/                  # UserManagement, MasterData, WorkflowConfig, AuditLogs
│   │
│   ├── routes/
│   │   ├── router.tsx              # createBrowserRouter tree
│   │   ├── ProtectedRoute.tsx      # Auth + role gate; redirects to /login
│   │   ├── RoleGate.tsx            # Element-level role gate for menu items / actions
│   │   └── ErrorBoundary.tsx       # Route-level ErrorBoundaryFallback
│   │
│   ├── hooks/                      # Cross-feature hooks (§5)
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── useTableParams.ts
│   │   ├── useConfirm.ts
│   │   ├── useToast.ts
│   │   ├── useDrawer.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useDebounce.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useIdleTimer.ts         # Session-expiry warning banner (arch §17 / UI Appendix A.2)
│   │   ├── useOnlineStatus.ts
│   │   ├── useCopy.ts
│   │   ├── useOptimisticLock.ts    # Handles 409 → banner + reload (UI Appendix A.1)
│   │   └── useZodForm.ts           # react-hook-form + zod wiring
│   │
│   ├── stores/                     # Zustand stores (§6)
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   ├── toast.store.ts
│   │   ├── notifications.store.ts
│   │   ├── search.store.ts
│   │   ├── table-prefs.store.ts
│   │   └── theme.store.ts
│   │
│   ├── context/                    # React context providers (§7)
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── I18nProvider.tsx
│   │   ├── FeatureFlagProvider.tsx
│   │   ├── ToastProvider.tsx
│   │   ├── ConfirmProvider.tsx
│   │   └── QueryProvider.tsx       # Wraps QueryClientProvider + devtools
│   │
│   ├── types/                      # Cross-cutting TS types (Role, ApiError, PagedResponse<T>)
│   ├── utils/                      # Pure helpers (date, currency, format, permission matrix)
│   ├── config/                     # env, feature flags, constants (roles, statuses, limits)
│   └── styles/                     # tokens.css, reset.css, print.css
│
├── public/                         # Static assets (favicon, robots.txt)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite config, proxy /api → backend
├── .eslintrc.cjs                   # Import restrictions: features cannot cross-import
├── playwright.config.ts            # E2E harness (shared with backend package via workspace)
└── Dockerfile
```

**Import discipline (ESLint-enforced):**
- `features/<a>/` cannot import from `features/<b>/`. Cross-feature use
  goes through `api/`, `hooks/`, `stores/`, or shared `components/`.
- `components/` cannot import from `features/` (primitives are feature-agnostic).
- `api/` cannot import from `features/`, `hooks/`, or `stores/` (API layer
  is pure infrastructure).
- `stores/` cannot import from `features/` (a store never depends on a feature).

---

## 2. Layouts

Layouts are route-level wrappers around `<Outlet/>` from React Router.
Every top-level route mounts one layout.

| Layout | Responsibility |
|---|---|
| **AppLayout** | The authenticated shell (arch §2.2 of UI doc): renders `Sidebar` + `TopBar` + main content region + global `ToastContainer` and modal/drawer portals. Applies role-aware sidebar filtering and route-change breadcrumb updates. All authenticated feature routes nest under this. |
| **AuthLayout** | Public frame for `/login`, `/forgot-password`, `/reset-password`. Centered card on a full-height brand background. No shell, no sidebar. Redirects to `/dashboard` if already authenticated. |
| **FullscreenLayout** | Full-viewport route with no sidebar or top bar. Used for the signature capture modal-page during a workflow transition and for the report preview print view. |
| **PrintLayout** | Same as Fullscreen but with `@media print` styles baked in. Report Viewer's "Print" opens a route mounted here. |
| **ErrorLayout** | Wraps 403 (`PermissionDenied`), 404 (`NotFound`), and 500 (`ErrorBoundaryFallback`) pages with a minimal frame and a "Back to Dashboard" action. |

---

## 3. Route Map

All routes are declared in `src/routes/router.tsx` using
`createBrowserRouter`. Every non-auth route wraps its element with
`<ProtectedRoute allowedRoles={[…]}/>`. `EM` = Employee, `PC` = People &
Culture, `ST` = Stores, `IT` = IT Representative, `SA` = Super Admin.

### 3.1 Public

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/login` | AuthLayout | LoginPage | Public |
| `/forgot-password` | AuthLayout | ForgotPasswordPage | Public |
| `/reset-password` | AuthLayout | ResetPasswordPage | Public (token-gated) |

### 3.2 Core (authenticated)

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/` | AppLayout | redirect → `/dashboard` | All |
| `/dashboard` | AppLayout | DashboardPage | All (role-specific view) |
| `/search` | AppLayout | GlobalSearchResultsPage | All |
| `/profile` | AppLayout | UserProfilePage | All (self) |
| `/notifications` | AppLayout | NotificationCenterPage | All (own) |
| `/notification-preferences` | AppLayout | NotificationPreferencesPage | All (self) |

### 3.3 Inventory

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/assets` | AppLayout | AssetListPage | SA, ST, IT, PC, EM* |
| `/assets/new` | AppLayout | AssetCreatePage | SA, ST |
| `/assets/:id` | AppLayout | AssetDetailPage | SA, ST, IT, PC, EM* |
| `/assets/:id/edit` | AppLayout | AssetEditPage | SA, ST |
| `/assets/:id/qr` | FullscreenLayout | AssetQrPrintPage | SA, ST |

*Employees see only their own assigned assets (row-scoped by API).

### 3.4 Employees

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/employees` | AppLayout | EmployeeListPage | SA, PC, ST, IT |
| `/employees/new` | AppLayout | EmployeeCreatePage | SA, PC |
| `/employees/:id` | AppLayout | EmployeeDetailPage | SA, PC, ST, IT |
| `/employees/:id/edit` | AppLayout | EmployeeEditPage | SA, PC |

### 3.5 Workflows

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/allocations` | AppLayout | AllocationListPage | SA, ST, IT, PC, EM |
| `/allocations/new` | AppLayout | NewAllocationRequestPage | All (EM submits) |
| `/allocations/:id` | AppLayout | AllocationDetailPage | Scoped by role |
| `/returns` | AppLayout | ReturnListPage | SA, ST, IT, PC, EM* |
| `/returns/new` | AppLayout | InitiateReturnPage | SA, PC, EM (self) |
| `/returns/:id` | AppLayout | ReturnDetailPage | Scoped |
| `/assessments` | AppLayout | AssessmentListPage | SA, IT, ST |
| `/assessments/new` | AppLayout | NewAssessmentPage | SA, IT, ST |
| `/assessments/:id` | AppLayout | AssessmentDetailPage | SA, IT, ST, PC |
| `/repairs` | AppLayout | RepairListPage | SA, IT, ST |
| `/repairs/new` | AppLayout | RepairCreatePage | SA, IT, ST |
| `/repairs/:id` | AppLayout | RepairDetailPage | SA, IT, ST |
| `/repairs/:id/edit` | AppLayout | RepairEditPage | SA, IT |
| `/disposals` | AppLayout | DisposalListPage | SA, ST |
| `/disposals/new` | AppLayout | DisposalRequestPage | SA, ST |
| `/disposals/:id` | AppLayout | DisposalDetailPage | SA, ST |

### 3.6 Vendors

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/vendors` | AppLayout | VendorListPage | SA, ST, IT |
| `/vendors/new` | AppLayout | VendorCreatePage | SA, ST |
| `/vendors/:id` | AppLayout | VendorDetailPage | SA, ST, IT |
| `/vendors/:id/edit` | AppLayout | VendorEditPage | SA, ST |

### 3.7 Reports & Compliance

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/reports` | AppLayout | ReportsHubPage | SA, PC, ST, IT |
| `/reports/:runId` | AppLayout | ReportViewerPage | Requester + SA |
| `/reports/:runId/print` | PrintLayout | ReportPrintPage | Requester + SA |
| `/compliance` | AppLayout | ComplianceDashboardPage | SA, PC |

### 3.8 Admin (Super Admin only)

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/admin/users` | AppLayout | UserManagementPage | SA |
| `/admin/users/new` | AppLayout | UserCreatePage | SA |
| `/admin/users/:id/edit` | AppLayout | UserEditPage | SA |
| `/admin/master-data` | AppLayout | MasterDataManagementPage | SA |
| `/admin/workflows` | AppLayout | WorkflowConfigPage | SA |
| `/admin/workflows/:id` | AppLayout | WorkflowConfigDetailPage | SA |
| `/admin/audit-logs` | AppLayout | AuditLogViewerPage | SA |

### 3.9 Error routes

| Path | Layout | Page | Roles |
|---|---|---|---|
| `/403` | ErrorLayout | PermissionDeniedPage | All |
| `/404` | ErrorLayout | NotFoundPage | All |
| `*` | ErrorLayout | NotFoundPage | All (catch-all) |

`ProtectedRoute` guards both authentication (redirect to `/login` on
absent/expired token) and role membership (redirect to `/403` when the
current role isn't in `allowedRoles`).

---

## 4. Pages

Each row is one page component. Every page maps 1:1 to a section in
[`12-ui-design.md`](12-ui-design.md); the "UI §" column shows which. Pages
own only their orchestration — data-fetching hooks, layout composition,
mutation callbacks — and delegate every visual piece to primitives from
[`13-component-library.md`](13-component-library.md) and to
feature-scoped composed components.

| Page | UI § | Responsibility |
|---|---|---|
| **LoginPage** | §3 | Login form, error handling, redirect on success. |
| **ForgotPasswordPage** | §3 (variant) | Email capture, submit, success confirmation. |
| **ResetPasswordPage** | §3 (variant) | Token verification, new-password form, submit. |
| **DashboardPage** | §4 | Role-specific composition of StatCards + PendingApprovals + ActivityFeed + charts. Reads dashboard endpoint per role. |
| **AssetListPage** | §5 | Paged, filtered, sortable asset table; opens Create in a Drawer. |
| **AssetDetailPage** | §6 | Header, KeyValueList of specs, tabs (Overview / History / Accessories / Documents), workflow action bar. |
| **AssetCreatePage / AssetEditPage** | §7 | AssetForm with grouped sections, save/cancel, optimistic locking on edit. |
| **AssetQrPrintPage** | §6.5 | QR + barcode + printable label view; FullscreenLayout. |
| **EmployeeListPage** | §8 | Employee table with filters. |
| **EmployeeDetailPage** | §9 | Profile + tabs (Overview / Assigned Assets / Asset History / Workflows). |
| **EmployeeCreatePage / EmployeeEditPage** | §10 | EmployeeForm. |
| **AllocationListPage** | §11 | Tabs by status + table + filters. |
| **NewAllocationRequestPage** | §13 | Request submission form (5 request types). |
| **AllocationDetailPage** | §12 | WorkflowStepper + StageCards + WorkflowActionBar + signature capture. |
| **ReturnListPage** | §14 | Return table with reason filter and status tabs. |
| **InitiateReturnPage** | §16 | Return initiation form with asset multi-select and item-level status entry. |
| **ReturnDetailPage** | §15 | Workflow view + item-level status + evidence gallery. |
| **AssessmentListPage** | §17 | Assessment table with outcome filter. |
| **NewAssessmentPage** | §19 | 23-point AssessmentChecklist + outcome + notes. |
| **AssessmentDetailPage** | §18 | Read-only assessment view + related workflow context. |
| **RepairListPage** | §20 | Repair table with status/priority filters. |
| **RepairCreatePage / RepairEditPage** | §22 | RepairForm (fault, technician, vendor, estimated cost, warranty snapshot). |
| **RepairDetailPage** | §21 | Timeline + cost + completion capture. |
| **DisposalListPage** | §23 | Disposal table + tabs for Requested / Approved / Recovered. |
| **DisposalRequestPage** | §25 | Disposal request form with evidence upload. |
| **DisposalDetailPage** | §24 | Approval workflow view + evidence gallery + recover action for SA. |
| **VendorListPage** | §26 | Vendor table. |
| **VendorDetailPage** | §27 | Vendor detail + tabs (Contracts / Assets Supplied / Repairs Serviced). |
| **VendorCreatePage / VendorEditPage** | §28 | VendorForm. |
| **UserManagementPage** | §29 | User admin table + create/edit modals. |
| **UserCreatePage / UserEditPage** | §30 | UserForm (email, role, employee link). |
| **MasterDataManagementPage** | §31 | Tabs for Departments / Offices / Device Types / Brands with per-tab CRUD. |
| **WorkflowConfigPage** | §32 (list) | Workflow definitions table. |
| **WorkflowConfigDetailPage** | §32.3 | State/transition/SLA editor. |
| **ReportsHubPage** | §33 | Report type gallery + recent runs. |
| **ReportViewerPage** | §34 | Rendered report + filter panel + export actions. |
| **ReportPrintPage** | §34 print variant | Print-optimized report render. |
| **NotificationCenterPage** | §35 | Full notification list, filters, mark-as-read. |
| **NotificationPreferencesPage** | §36 | Per-type channel and frequency preferences. |
| **AuditLogViewerPage** | §37 | Audit log table with entity/user/date filters + diff drawer. |
| **ComplianceDashboardPage** | §38 | Breach summary tiles + active breaches table + escalation log. |
| **GlobalSearchResultsPage** | §39 | Grouped search results (Assets / Employees / Vendors). |
| **UserProfilePage** | §40 | Profile tabs (Overview / Security / Preferences). |
| **PermissionDeniedPage** | UI Appendix | 403 with role explanation and "Back to Dashboard." |
| **NotFoundPage** | UI Appendix | 404 with "Back to Dashboard." |
| **ErrorBoundaryFallbackPage** | UI Appendix | 500 with correlation ID for support. |

---

## 5. Components

Two layers:

**Reusable primitives** — inventoried in
[`13-component-library.md`](13-component-library.md) (14 groups: shell,
buttons, forms, tables, badges, avatars, cards, workflow, feedback,
timeline, charts, files, states, layout-utils). This document does not
re-list them; the frontend imports each from `src/components/` per the
folder structure in §1.

**Feature-scoped composed components** — live under
`features/<name>/components/`, are not reused across features, and
combine multiple primitives for one specific screen. Listed here:

| Feature | Composed Components |
|---|---|
| **auth** | `LoginForm`, `ChangePasswordForm`, `PasswordStrengthMeter` |
| **dashboard** | `DashboardStatRow`, `PendingApprovalsPanel`, `RecentActivityPanel`, `AssetsByDepartmentChart`, `AssetsByStatusChart`, `AssetsByBrandChart`, `AssetsByTypeChart`, `MonthlyAllocationChart`, `MonthlyReturnsChart`, `RoleSpecificDashboard` (dispatches to per-role composition) |
| **assets** | `AssetForm`, `AssetAccessoriesTable`, `AssetHistoryTimeline`, `AssetSpecPanel`, `AssetHolderPanel`, `AssetQrPrintCard`, `AssetStatusTransitionModal` (SA bypass) |
| **employees** | `EmployeeForm`, `EmployeeAssignedAssetsPanel`, `EmployeeAssetHistoryPanel`, `EmployeeManagerChainViewer` |
| **vendors** | `VendorForm`, `VendorContractsPanel`, `VendorSuppliedAssetsPanel`, `VendorRepairsServicedPanel` |
| **acquisitions** | `AcquisitionForm`, `AcquisitionAssetLinesEditor` |
| **allocations** | `SubmitAllocationForm`, `AllocationRequestTypeSelector`, `AllocationSelectAssetPanel`, `AllocationSignaturePanel`, `AllocationDetailWorkflow` |
| **returns** | `InitiateReturnForm`, `ReturnAssetPickerPanel`, `ReturnItemStatusEditor`, `ReturnEvidenceGallery`, `LostStolenTransitionModal` |
| **assessments** | `AssessmentChecklistForm` (23-point), `AssessmentOutcomeSelector`, `AssessmentTechnicianNotesEditor` |
| **repairs** | `RepairForm`, `RepairTimelinePanel`, `RepairCostPanel`, `RepairCompletionModal` |
| **disposals** | `DisposalRequestForm`, `DisposalApprovalModal`, `DisposalEvidenceGallery`, `DisposalRecoveryModal` |
| **compliance** | `ComplianceBreachDetailDrawer`, `EscalationLogPanel`, `SLAConfigEditor`, `AcknowledgeBreachModal` |
| **notifications** | `NotificationList`, `NotificationPreferenceMatrix`, `DigestSchedulePreview` |
| **reports** | `ReportTypeCard`, `ReportFilterPanel`, `ReportExportActions`, `ReportRunHistoryTable`, `ReportRenderer` (delegates to per-type sub-renderers) |
| **search** | `SearchResultsGroup`, `RecentSearchesPanel`, `SearchEmptyState` |
| **profile** | `ProfileOverviewPanel`, `SecurityPanel`, `PreferencesPanel` |
| **admin** | `UserForm`, `RolePicker`, `MasterDataEntityCrudTab`, `WorkflowDefinitionEditor`, `WorkflowGraphViewer`, `StageEditor`, `SLAThresholdEditor`, `AuditLogDiffDrawer` |

Composed components stay under 300 lines each; anything larger is split
into further sub-components inside the same feature folder.

---

## 6. Hooks

### 6.1 Cross-cutting (in `src/hooks/`)

| Hook | Responsibility |
|---|---|
| **useAuth** | Reads `authStore` and exposes `{ user, role, isAuthenticated, login, logout, refresh }`. |
| **usePermission** | Returns `can(action, resource?)` — checks the current user's permissions plus optional per-record policy (mirrors backend §PolicyGuard shape). Used to hide/disable actions. |
| **useRequireRole** | Assertion hook — throws a redirect if the caller isn't in the given role set. Backup for `<ProtectedRoute/>`. |
| **useTableParams** | Binds table state (page, pageSize, sort, filters, search) to URL search params; provides `params` object to pass into feature data hooks. Enables link-shareable table views. |
| **useConfirm** | Imperative `confirm({ title, description, destructive })` returning a Promise — resolves true/false. Backed by `ConfirmProvider`. |
| **useToast** | Imperative `toast.success/error/warning/info(msg, options?)`. Backed by `ToastProvider` / `toastStore`. |
| **useDrawer** | Imperative open/close of a global-portal Drawer with `{ title, content, onClose }`. |
| **useMediaQuery** | Reactive matches for breakpoints (`isMobile`, `isTablet`, `isDesktop`). |
| **useDebounce** | Debounced value for search inputs and filter changes. |
| **useKeyboardShortcuts** | Registers global shortcuts (`Ctrl+K` opens CommandPalette, `Esc` closes topmost overlay) — see UI Appendix A.7. |
| **useIdleTimer** | Fires callbacks at idle thresholds; drives session-expiry warning banner (UI A.2). |
| **useOnlineStatus** | Boolean online/offline; drives an offline banner on sustained loss. |
| **useCopy** | Copy to clipboard with `Toast` confirmation. |
| **useOptimisticLock** | Wraps a mutation: on `409 CONFLICT`, shows a Banner ("Someone else modified this record") + reload option (UI A.1). |
| **useZodForm** | Thin wrapper composing `react-hook-form` with a `zod` resolver + default configuration (`shouldFocusError: true`). |

### 6.2 Feature hooks (in `features/<name>/hooks/`)

Naming: read hooks match `useX`/`useXList`; mutation hooks match
`useCreateX`/`useUpdateX`/etc. Every hook is a thin wrapper around
TanStack Query (`useQuery` / `useMutation`) calling the matching
`api/<module>.api.ts` function. Mutations invalidate the relevant query
keys from `api/query-keys.ts` and surface errors as toasts.

Representative set (not exhaustive):

| Feature | Query hooks | Mutation hooks |
|---|---|---|
| **auth** | `useCurrentUser` | `useLogin`, `useLogout`, `useForgotPassword`, `useResetPassword`, `useChangePassword` |
| **assets** | `useAssets`, `useAsset`, `useAssetHistory` | `useCreateAsset`, `useUpdateAsset`, `useChangeAssetStatus` |
| **employees** | `useEmployees`, `useEmployee`, `useEmployeeAssets` | `useCreateEmployee`, `useUpdateEmployee`, `useChangeEmploymentStatus` |
| **vendors** | `useVendors`, `useVendor` | `useCreateVendor`, `useUpdateVendor`, `useDeactivateVendor` |
| **acquisitions** | `useAcquisitions`, `useAcquisition` | `useRegisterAcquisition` |
| **allocations** | `useAllocations`, `useAllocation`, `usePendingAllocationsForRole` | `useSubmitAllocation`, `useSelectAsset`, `useSignAllocation` |
| **returns** | `useReturns`, `useReturn` | `useInitiateReturn`, `useRecordReturnItems`, `useSignReturn`, `useCompleteReturn`, `useReportLostStolen` |
| **assessments** | `useAssessments`, `useAssessment`, `useLatestAssessmentForAsset` | `useCreateAssessment`, `useCompleteAssessment` |
| **repairs** | `useRepairs`, `useRepair` | `useCreateRepair`, `useUpdateRepairStatus`, `useCompleteRepair` |
| **disposals** | `useDisposals`, `useDisposal` | `useRequestDisposal`, `useApproveDisposal`, `useRejectDisposal`, `useRecoverAsset` |
| **notifications** | `useNotifications`, `useUnreadCount`, `useNotificationPreferences` | `useMarkNotificationRead`, `useMarkAllRead`, `useUpdatePreferences` |
| **compliance** | `useBreaches`, `useEscalations`, `useSlaConfig` | `useAcknowledgeBreach`, `useUpdateSlaConfig` |
| **reports** | `useReportTypes`, `useReportRun`, `useReportRuns` | `useGenerateReport` |
| **search** | `useGlobalSearch`, `useAssetSearch`, `useEmployeeSearch`, `useVendorSearch` | — |
| **audit** | `useAuditLogs`, `useAuditLogEntry` | — |
| **admin** | `useUsers`, `useUser`, `useMasterData(type)`, `useWorkflowDefinitions`, `useWorkflowDefinition` | `useCreateUser`, `useUpdateUser`, `useDeactivateUser`, `useUpsertMasterData`, `useSaveWorkflowDefinition` |
| **workflows** (engine, cross-feature) | `useWorkflowInstance` | `useTransition`, `useBypass` |

---

## 7. Stores (Zustand)

Zustand holds **client** state only. Server state lives in TanStack
Query — never mirrored into Zustand. A store never holds anything
derivable from a query cache.

| Store | State | Responsibilities |
|---|---|---|
| **auth.store** | `{ accessToken, refreshToken, user, permissions, expiresAt }` | Token lifecycle, in-memory + `sessionStorage` persistence, exposed via `AuthProvider` and `useAuth`. Cleared on logout and on refresh failure. |
| **ui.store** | `{ sidebarCollapsed, activeModalId, activeDrawerId, breadcrumbOverride }` | Cross-page UI state that outlives route changes. |
| **theme.store** | `{ theme: 'light' \| 'dark' \| 'system' }` | Persisted to `localStorage`; drives root `data-theme` attribute. |
| **toast.store** | `{ queue: Toast[] }` | Toast queue with add/remove; consumed by `ToastContainer`. |
| **notifications.store** | `{ unreadCount, lastFetchedAt }` | Live unread count for the bell badge; updated by a low-frequency background query and by realtime notification pushes when added. |
| **search.store** | `{ recentQueries, currentQuery }` | Recent-search list surfaced in the CommandPalette; capped to N entries and persisted per user. |
| **table-prefs.store** | `{ perView: Record<viewId, { columns, pageSize }> }` | Persisted table column visibility and page-size preference per named view. |

---

## 8. Context

Context providers wrap `<App/>` in `App.tsx`. Where a slice of client
state exists in Zustand, the context is a thin bridge exposing an
imperative API — the store is the source of truth. Where the concern is
purely structural (theme attribute, i18n locale wiring), the context owns
the value directly.

| Provider | Wraps | Responsibility |
|---|---|---|
| **QueryProvider** | Everything | Instantiates `QueryClient` with global defaults (staleTime, retry policy, error mapper). Also mounts `ReactQueryDevtools` in dev. |
| **AuthProvider** | Router | Hydrates `auth.store` from storage on mount, schedules refresh, listens for `401` from Axios interceptor to logout globally. Emits `AuthReady` event before rendering the router to avoid flash-of-login. |
| **ThemeProvider** | Router | Applies `data-theme` to `<html>`, listens to `prefers-color-scheme` when theme is `system`. |
| **I18nProvider** | Router | Locale + translations; injects `t()` via context; currency/date formatters derived from locale. |
| **FeatureFlagProvider** | Router | Server-fetched or env-based flag map; exposes `useFlag(name)`. Gates half-built modules during phased rollout. |
| **ToastProvider** | Router | Renders the toast container portal; exposes imperative API through `useToast`. |
| **ConfirmProvider** | Router | Renders the ConfirmModal portal; exposes `useConfirm` returning a Promise. |

Ordering (outermost first): `QueryProvider` → `ThemeProvider` →
`I18nProvider` → `FeatureFlagProvider` → `AuthProvider` →
`ToastProvider` → `ConfirmProvider` → `<RouterProvider/>`.

---

## 9. API Layer

Everything hitting the backend goes through `src/api/`. No feature calls
`fetch` or `axios` directly.

### 9.1 `client.ts` — Axios instance

Base URL from `import.meta.env.VITE_API_BASE_URL`. Configured with:

- **Timeout**: 30s default; report generation endpoints override to 5m.
- **withCredentials**: `true` for cookie-based CSRF token exchange (arch §17.4).
- **JSON handling**: request/response `Content-Type: application/json`;
  multipart handled by a separate `uploadClient` for `/files/upload`.

### 9.2 Interceptors

| Interceptor | Direction | Responsibility |
|---|---|---|
| **AttachAuth** | Request | Attaches `Authorization: Bearer <accessToken>` from `auth.store`; skips if store is empty (login/refresh endpoints). |
| **AttachCorrelationId** | Request | Generates a UUID per request, sends as `X-Correlation-ID`, and stashes it on the response for error reporting. |
| **AttachIdempotencyKey** | Request | For mutations flagged idempotent (create endpoints), sends `Idempotency-Key`; the same key is retried on network failure without duplicating writes. |
| **RefreshOn401** | Response | On `401` for any endpoint other than `/auth/*`, attempts a single refresh via `refreshToken`; on success replays the original request, on failure logs out and redirects to `/login?returnTo=`. Coalesces concurrent 401s so only one refresh flies. |
| **NormalizeErrors** | Response | Translates the backend error envelope (arch §18.2 — `{code, message, correlationId, details}`) into a typed `ApiError` class carrying `statusCode`, `code`, `userMessage`, and `fieldErrors` for form binding. |
| **RetryOnNetwork** | Response | Exponential backoff (2s/4s/8s) on network-class errors only; never retries on 4xx. Bounded to 3 attempts. |

### 9.3 Endpoint modules

One file per backend module (see folder structure §1). Each exports
typed functions named after the endpoint action (`login`, `refresh`,
`listAssets`, `getAsset`, `createAsset`, `updateAsset`, `changeStatus`,
`generateAssetQr`, …). Request and response types come from
`api/types/` (generated from the backend OpenAPI spec at M1 — see
[`11-api-design.md`](11-api-design.md)); this keeps types in lockstep
with backend contracts.

### 9.4 `query-keys.ts` — TanStack Query key factory

Centralized key builders per resource, e.g.:

```
assets.all          → ['assets']
assets.list(params) → ['assets', 'list', normalizedParams]
assets.byId(id)     → ['assets', 'detail', id]
assets.history(id)  → ['assets', 'history', id]
```

Mutation hooks invalidate at the coarsest correct level (e.g., a status
change invalidates both `assets.byId(id)` and `assets.all`) so no
mutation ever forgets to bust a cache.

---

## 10. State Management Strategy

Four categories, each with a single home. Anything ambiguous defaults to
the highest category on this list (server > URL > form > client) so we
avoid duplicated sources of truth.

| Category | Home | What lives there |
|---|---|---|
| **Server state** | TanStack Query | Everything fetched from the API: assets, employees, workflow instances, notifications, permissions. Never mirrored into Zustand or component state. |
| **URL state** | React Router search params, via `useTableParams` | Filter/sort/pagination for tables, tab selection on detail pages, search queries. Enables deep-linkable, shareable, browser-back-friendly views. |
| **Form state** | react-hook-form + zod, via `useZodForm` | Field values, dirty/touched flags, per-field errors, submission state. Cleared on unmount. |
| **Client state** | Zustand stores (§7) | Cross-page UI slices only: auth tokens, sidebar collapsed, active theme, toast queue, unread notification count, table column prefs, recent searches. |

### 10.1 Data-flow rules

- Reads always begin with a query hook. Components never call the API
  layer directly.
- Writes always go through mutation hooks. Optimistic updates use
  `queryClient.setQueryData` inside `onMutate` with a rollback in
  `onError`; conflicts on `409` are handled by `useOptimisticLock`.
- Router-driven filter state (`useTableParams`) is the input to feature
  list queries; changing filters updates the URL, which updates the
  query key, which refetches — no manual imperative fetch.
- Cross-component notification (open a drawer, show a toast, confirm
  destructive action) always goes through the imperative hooks
  (`useDrawer`, `useToast`, `useConfirm`) so overlays live in one portal
  tree.

### 10.2 Caching defaults

| Query family | staleTime | cacheTime | Refetch on window focus |
|---|---|---|---|
| Master data (departments, offices, types, brands) | 15 min | 60 min | No |
| Current user / permissions | 5 min | 60 min | Yes |
| Dashboard counts | 30 s | 5 min | Yes |
| List views (assets, employees, workflows) | 30 s | 5 min | Yes |
| Detail views | 30 s | 5 min | Yes |
| Notifications (unread count) | 15 s | 2 min | Yes |
| Audit logs | 60 s | 5 min | No |
| Reports (list of runs) | 15 s | 5 min | Yes |

Per-hook overrides remain possible but should be a conscious choice
noted in the hook file.

### 10.3 Realtime updates (deferred to post-M2)

WebSocket or SSE push for notifications and workflow-stage changes is
scoped for M7+. Until then, the query defaults above (short staleTime +
refetch-on-focus) keep the UI responsive without a socket connection.

---

## Notes on scope

- This document is the **implementation-time contract** for the
  frontend. Any new page/hook/store/context/API module introduced during
  coding updates this document in the same commit as the code.
- Backend module names are mirrored in feature folders and API-module
  filenames verbatim so a developer working on one side can find the
  matching code on the other side by name alone.
- Nothing here overrides
  [`13-component-library.md`](13-component-library.md) — that document
  remains the authoritative list of reusable primitives.
