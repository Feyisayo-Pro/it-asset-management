# Component Library

Reusable UI components required to build every page specified in
[`12-ui-design.md`](12-ui-design.md). This document is the single source of
truth for the component inventory — page specs reference these by name.

Descriptions only — no implementation. Structural details (props, slots,
variants) will be locked when Phase 4 (Frontend) begins; this document
establishes *what* exists and *what each thing is for*.

The library is intentionally grouped, not alphabetical, so gaps in a
category are obvious. Every component named in a page spec (§2–§40 of the
UI design) must appear here; if a new page spec needs a component not
listed below, this document is updated first.

## Design tokens (context)

All components consume the design tokens defined in
[`12-ui-design.md`](12-ui-design.md) §1.3 (typography), §1.4 (color), and
the icon set in §1.6 (Lucide). Components never hard-code colors, spacing,
or font sizes — everything reads from tokens so light/dark theming and
future rebrand are single-file changes.

---

## 1. App Shell & Navigation

| Component | Description |
|---|---|
| **AppShell** | Persistent frame: TopBar + Sidebar + main content region. Handles route transitions without full reloads and manages sidebar expand/collapse state. |
| **TopBar** | 56px header holding hamburger, breadcrumb, global search trigger, notification bell, and user avatar. Sticky. |
| **Sidebar** | Left-hand primary nav, 240px expanded / 64px collapsed. Role-aware — items the current role can't access are hidden, not disabled. Groups auto-expand when a child is active. |
| **NavItem** | Single sidebar link. Icon + label; active state = 3px accent left border and tinted background. Tooltip on hover when collapsed. |
| **NavGroup** | Collapsible sidebar section (e.g., Workflows, Admin). Chevron for expand/collapse; popover menu when the sidebar is collapsed. |
| **Breadcrumb** | Route-derived trail (`Dashboard / Assets / AST-0042`). Max 3 levels; middle segments collapse to `…`. Non-terminal segments are links. |
| **PageHeader** | Page-level heading: title, optional subtitle, breadcrumb slot, and primary/secondary action button slot (top-right). |
| **UserMenu** | Avatar-triggered dropdown: name, role badge, email, My Profile, Change Password, Logout. |
| **NotificationDropdown** | Bell-triggered panel showing 10 most recent notifications with icon, subject, relative time. Footer link to full Notification Center. |
| **CommandPalette** | `Ctrl+K` global search overlay. Grouped type-ahead results (Assets, Employees, Vendors), keyboard-only navigation, Esc dismiss. |

## 2. Buttons & Actions

| Component | Description |
|---|---|
| **Button** | Primary / secondary / tertiary / destructive variants. Sizes sm/md/lg. Supports leading/trailing icons, loading spinner state, and disabled state with tooltip reason. |
| **IconButton** | Icon-only button used in table rows and toolbars. Ships with accessible label + tooltip. |
| **SplitButton** | Primary action + adjacent chevron dropdown of related actions (used on Asset Detail for "Allocate ▾"). |
| **LinkButton** | Text-only button styled as a link — used for "Clear all filters," "View all," etc. |
| **ActionMenu** | Kebab (`⋮`) dropdown of row-level or entity-level actions. Groups destructive items at the bottom with a divider. |
| **BulkActionBar** | Sticky bar that appears above a table when rows are selected: selection count, action buttons, deselect-all. |

## 3. Forms & Inputs

| Component | Description |
|---|---|
| **Form** | Root wrapper: manages values, validation state, submission, and dirty tracking. Emits per-field and form-level errors. |
| **FormSection** | Grouped fields under a section heading and optional description, with a border-bottom divider. |
| **FormField** | Label + input + help text + error message layout wrapper. Handles required-asterisk and disabled visual. |
| **TextInput** | Single-line text field. Supports prefix/suffix icons, character counter, and masked variant. |
| **TextArea** | Multi-line input with auto-grow and character counter. |
| **PasswordField** | Text input with reveal toggle and strength meter (on password-change forms). |
| **SearchInput** | Text input with search icon, clear (`×`) button, and debounced onChange. |
| **NumberInput** | Numeric input with stepper buttons and min/max clamping. Used for currency and quantity. |
| **CurrencyInput** | NumberInput variant with currency-symbol prefix and thousands separators. |
| **Select** | Single-select dropdown with searchable option list, keyboard navigation, and grouped options. |
| **MultiSelect** | Multi-value dropdown rendering chosen values as removable chips inside the field. |
| **Combobox** | Autocomplete input backed by an async data source — used for Employee, Asset, Vendor picker fields. |
| **DatePicker** | Single-date picker with keyboard input and calendar popover. |
| **DateRangePicker** | Two-date picker for report filters and audit-log ranges. Presets: Today / Last 7d / Last 30d / Custom. |
| **Checkbox** | Standard boolean field. Supports indeterminate state (used in table select-all). |
| **Radio / RadioGroup** | Single-choice group with horizontal or vertical layout. |
| **Switch** | Toggle input for on/off preferences (Notification Preferences page). |
| **FileUpload** | Drag-and-drop + click-to-browse. Validates MIME type and size; renders per-file progress and error rows. |
| **SignatureBox** | Workflow-approval field: typed full-name input + consent checkbox + auto-captured timestamp/IP. Emits a signature record on submit. |
| **FormError** | Inline field-level error text with error icon and red accent. |
| **FormBanner** | Form-level error/warning/info banner at the top of a form for cross-field or server errors. |

## 4. Tables & Lists

| Component | Description |
|---|---|
| **DataTable** | Sortable, paginated table. Fixed header on scroll, row hover highlight, row-click navigation, checkbox column, column visibility toggle. |
| **TableColumn** | Column definition: header, accessor, sort key, alignment, width, hide-at-breakpoint. |
| **TableRow / TableCell** | Rendering primitives. Cells support truncation with tooltip on overflow. |
| **FilterBar** | Horizontal bar above tables: dropdown filters, search input, date pickers, "Clear all" link. |
| **FilterChip** | Active filter pill with label + remove (`×`). Used to show the currently applied filter set. |
| **ColumnPicker** | Popover of checkboxes for showing/hiding table columns; state persisted per user per view. |
| **SortControl** | Header sort indicator (`↑ / ↓ / neutral`) and click-to-cycle behavior. |
| **Pagination** | Page numbers with prev/next, ellipsis for large ranges, current-page highlight. |
| **PerPageSelector** | Right-aligned dropdown next to pagination (10 / 20 / 50 / 100). |
| **ResponsiveCardList** | Below 768px, DataTable transforms into a stacked card list rendered by this component. |
| **KeyValueList** | Definition-list style two-column layout for detail-page metadata (`Serial Number: SN12345`). |

## 5. Status, Badges & Chips

| Component | Description |
|---|---|
| **StatusBadge** | Pill with semantic color for asset/workflow status (Available/Allocated/Under Repair/Disposed/Pending/Completed/Cancelled/Lost/Stolen/Unaccounted). |
| **StatusPill** | Smaller, outlined variant of StatusBadge used inline in tables. |
| **RoleBadge** | Colored badge for user role (Super Admin, Stores, IT, P&C, Employee). |
| **SLABadge** | Traffic-light badge (green within, amber near breach, red breached). Shows remaining time on hover. |
| **Tag** | Neutral pill for free-form labels (department, office, category). |
| **CountBadge** | Small round badge on icons for unread counts (e.g., bell `9+`). |
| **PriorityBadge** | Low / Normal / High / Critical indicator for repair and allocation records. |
| **AssessmentOutcomeBadge** | Pass / Repair Recommended / Replacement Recommended / Reject — with semantic color. |

## 6. Identity & Avatars

| Component | Description |
|---|---|
| **Avatar** | Circular image with initials fallback. Sizes xs/sm/md/lg. Optional online/status dot. |
| **AvatarStack** | Overlapping avatars with `+N` overflow — used to show multiple approvers or assignees. |
| **UserChip** | Avatar + name + optional role badge. Clickable to open employee/user profile. |

## 7. Cards

| Component | Description |
|---|---|
| **Card** | Base surface: padding, border, radius, header/body/footer slots. Everything below is a specialization. |
| **StatCard** | Icon + count + label + optional trend indicator (▲/▼ vs. previous period). Dashboard tile. |
| **DashboardCard** | Larger card wrapping a chart or list on the Dashboard, with a title bar and optional filter/period selector. |
| **WorkflowCard** | Summarizes a single in-flight workflow instance (Allocation/Return/Assessment/Repair/Disposal): title, current stage, assignee avatar, SLA badge, primary action. |
| **ApprovalCard** | Pending-approval item on the dashboard: subject, requester, waiting-time, Approve/Reject actions inline. |
| **ActivityCard** | Feed item wrapping a TimelineEntry with entity link and quick-action links. |
| **AssetSummaryCard** | Compact asset preview: tag, type icon, model, current holder, StatusBadge. Used in search results and pickers. |
| **EmployeeSummaryCard** | Compact employee preview: avatar, name, department, designation, employment status. |
| **VendorSummaryCard** | Vendor name, category, contact, contract expiry indicator. |
| **InfoCallout** | Muted card with icon for tips, notices, or contextual guidance inline within a page. |

## 8. Workflow-Specific

| Component | Description |
|---|---|
| **WorkflowStepper** | Horizontal step indicator: completed (checkmark) → current (highlighted, role label) → future (muted). Vertical variant for detail pages. |
| **StageCard** | Single stage in a vertical workflow view: role, actor, timestamp, comment, evidence. |
| **WorkflowActionBar** | Sticky bar on workflow detail pages showing the next allowed action(s) for the current user's role. Disabled with reason tooltip when out of role. |
| **AssessmentChecklist** | 23-item checklist grid with Pass/Fail/N-A per item and per-item note. Header shows aggregate score. |
| **BypassBanner** | Red banner on any workflow instance where the bypass/expedite path was used, showing who bypassed and why. Feeds the Compliance view. |
| **SignatureBlock** | Read-only rendering of a captured signature: signer name, role, timestamp, IP. |

## 9. Feedback & Overlays

| Component | Description |
|---|---|
| **Modal** | Centered dialog with header, body, footer. Focus-trapped, Esc-dismissable, scrim behind. |
| **ConfirmModal** | Standardized Modal: icon + title + description + Cancel / Confirm. Destructive variant swaps confirm to red and requires typed confirmation for high-risk actions. |
| **Drawer** | Right-side slide-in panel for secondary tasks (quick-edit, filter details, workflow-stage detail). Doesn't remove page context. |
| **Toast** | Floating top-right notifier; success/error/warning/info; auto-dismiss 5s; stacking; action link supported (e.g., "Undo"). |
| **Banner** | Full-width in-page alert (info/warning/danger/success) with optional dismiss. Used for session-expiry warnings, optimistic-locking conflicts. |
| **Tooltip** | Hover/focus tooltip with 300ms delay and arrow. Used on IconButtons, truncated cells, disabled-action reasons. |
| **Popover** | Click-triggered small overlay for filter previews, column pickers, small forms. |
| **Dropdown** | Menu of items with keyboard nav, dividers, and destructive-item styling. Base for ActionMenu, UserMenu, sort/filter selects. |

## 10. Timeline & Audit

| Component | Description |
|---|---|
| **Timeline** | Vertical container with connecting line for chronological event streams. |
| **TimelineEntry** | Single node: avatar, action description, timestamp, optional expand for old/new values. |
| **ActivityFeed** | Timeline specialization used on Dashboard and entity detail pages; supports infinite scroll and filter by event type. |
| **AuditLogEntry** | Row/card variant of TimelineEntry that emphasizes user, IP, and before/after diff for admin audit views. |
| **DiffView** | Old-value / new-value side-by-side rendering used inside AuditLogEntry expansions. |

## 11. Charts

| Component | Description |
|---|---|
| **ChartContainer** | Standard chart wrapper: title, legend, period selector, empty/loading state, export-image action. |
| **BarChart** | Categorical bar chart. Used for Assets by Department, Assets by Brand. |
| **StackedBarChart** | Stacked variant for Monthly Allocation vs. Returns. |
| **LineChart** | Time-series line chart for monthly trends. |
| **DonutChart** | Categorical share chart for Assets by Status and Assets by Type. |
| **Sparkline** | Inline minimal chart embedded in StatCards for trend context. |
| **HeatmapCalendar** | Day-grid heatmap for SLA-breach density on Compliance. |
| **ChartLegend / ChartTooltip** | Shared subcomponents for hover value display and series toggling. |

## 12. Files, Evidence & Codes

| Component | Description |
|---|---|
| **FilePreview** | Thumbnail or icon + filename + size + remove/download actions. Used post-upload. |
| **PhotoGallery** | Grid of return/disposal evidence images with lightbox open on click. |
| **AttachmentList** | Vertical list of attachments with type icons, filename, uploader, timestamp, download link. |
| **QRCodeDisplay** | Renders the asset's QR code with size options and a print button. |
| **BarcodeDisplay** | Renders 1D barcode (asset tag) with print/copy actions. |
| **CopyButton** | Tiny inline button next to an ID/serial that copies to clipboard and confirms with a Toast. |

## 13. Empty, Loading & Error States

| Component | Description |
|---|---|
| **EmptyState** | Centered illustration + heading + subtext + primary action. Used when a table/section has no data. |
| **Skeleton** | Animated placeholder matched to the shape of the loading content. Variants: text line, avatar, card, table row. |
| **LoadingSpinner** | Indeterminate spinner in three sizes; used inside Buttons and small regions. |
| **ProgressBar** | Determinate horizontal progress (file uploads, report generation). |
| **ErrorState** | Full-region error surface with retry action; used when a fetch fails. |
| **ErrorBoundaryFallback** | Route-level crash fallback with error id, "Reload," and "Go home." |
| **PermissionDenied** | Standardized 403 view: shield icon, explanation, "Go back" action. |

## 14. Layout Utilities

| Component | Description |
|---|---|
| **Tabs / TabPanel** | Horizontal tab strip used on Asset Detail, Employee Detail, Master Data, User Profile pages. |
| **Divider** | Horizontal or vertical rule with optional label. |
| **Stack / Grid** | Layout primitives for consistent spacing without ad-hoc CSS. |
| **CardGrid** | Responsive grid used for stat card rows (`4-up → 2-up → stacked`). |
| **DetailPanel** | Right-aligned metadata rail used on detail pages next to the primary content area. |
| **ScrollShadow** | Wrapper that fades content edges to signal more content on scroll (long detail pages, sidebars). |

---

## Relationship to `12-ui-design.md` §1.5

The UI design doc §1.5 lists 13 components as a starter reference. This
document is the *complete* inventory: every page spec (§2–§40) resolves to
one or more components listed here. Where the same visual concept appears
in both, this document is authoritative.

## Change control

- New components are added here first, then referenced from page specs.
- Renaming a component requires updating every page spec that references
  it in the same commit.
- Deletion requires confirming no page spec references the component.
