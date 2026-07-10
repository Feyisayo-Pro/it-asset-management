# UI/UX Design Document
## IT Asset Lifecycle Management & Workflow Platform

Version 0.1 — Phase 2 deliverable (pre-implementation)

---

## Table of Contents

1. [Design System & Principles](#1-design-system--principles)
2. [Global Layout — App Shell](#2-global-layout--app-shell)
3. [Login Page](#3-login-page)
4. [Dashboard](#4-dashboard)
5. [Asset List Page](#5-asset-list-page)
6. [Asset Detail Page](#6-asset-detail-page)
7. [Asset Create / Edit Form](#7-asset-create--edit-form)
8. [Employee List Page](#8-employee-list-page)
9. [Employee Detail Page](#9-employee-detail-page)
10. [Employee Create / Edit Form](#10-employee-create--edit-form)
11. [Allocation List Page](#11-allocation-list-page)
12. [Allocation Detail Page](#12-allocation-detail-page)
13. [New Allocation Request Form](#13-new-allocation-request-form)
14. [Return List Page](#14-return-list-page)
15. [Return Detail Page](#15-return-detail-page)
16. [Initiate Return Form](#16-initiate-return-form)
17. [Assessment List Page](#17-assessment-list-page)
18. [Assessment Detail Page](#18-assessment-detail-page)
19. [New Assessment Form](#19-new-assessment-form)
20. [Repair List Page](#20-repair-list-page)
21. [Repair Detail Page](#21-repair-detail-page)
22. [Repair Create / Edit Form](#22-repair-create--edit-form)
23. [Disposal List Page](#23-disposal-list-page)
24. [Disposal Detail Page](#24-disposal-detail-page)
25. [Disposal Request Form](#25-disposal-request-form)
26. [Vendor List Page](#26-vendor-list-page)
27. [Vendor Detail Page](#27-vendor-detail-page)
28. [Vendor Create / Edit Form](#28-vendor-create--edit-form)
29. [User Management Page](#29-user-management-page)
30. [User Create / Edit Form](#30-user-create--edit-form)
31. [Master Data Management Page](#31-master-data-management-page)
32. [Workflow Configuration Page](#32-workflow-configuration-page)
33. [Reports Hub](#33-reports-hub)
34. [Report Viewer Page](#34-report-viewer-page)
35. [Notification Center](#35-notification-center)
36. [Notification Preferences Page](#36-notification-preferences-page)
37. [Audit Log Viewer](#37-audit-log-viewer)
38. [Compliance Dashboard](#38-compliance-dashboard)
39. [Global Search Results Page](#39-global-search-results-page)
40. [User Profile Page](#40-user-profile-page)

---

## 1. Design System & Principles

### 1.1 Design Philosophy

The platform is modeled after enterprise tools — Jira, Odoo, ServiceNow —
prioritizing **information density**, **scanability**, and **workflow
efficiency** over visual flair. Every screen should answer: *"What needs
my attention right now, and how do I act on it?"*

**Core principles:**

| Principle | Implementation |
|---|---|
| **Task-oriented** | Every page leads with actionable items. Dashboard shows "Pending your action," not generic summaries. |
| **Progressive disclosure** | List → Detail → Edit. No overwhelming forms on first contact. |
| **Role-aware UI** | Navigation, actions, and data scope adapt per role. An Employee sees their own assets and requests; a Super Admin sees everything. |
| **Consistent patterns** | Every list page uses the same filter bar, table, pagination, and empty state pattern. Once a user learns one module, they know them all. |
| **Keyboard-first** | Global search via `Ctrl+K` / `⌘K`. Table rows navigable with arrow keys. Modals close with `Esc`. Forms submit with `Ctrl+Enter`. |
| **Feedback always** | Every action produces feedback: toast notification for success, inline error for validation, modal confirmation for destructive actions. |

### 1.2 Layout Grid

- **12-column grid**, 24px gutter
- Max content width: **1440px**, centered
- Sidebar width: **240px** (collapsed: 64px)
- Page content area: **1200px max** (within the remaining space)
- Responsive breakpoints:
  - `≥1440px`: Full layout, sidebar expanded
  - `1024–1439px`: Sidebar collapsed to icons
  - `768–1023px`: Sidebar hidden, hamburger menu
  - `<768px`: Mobile layout, stacked cards instead of tables

### 1.3 Typography

| Role | Font | Size | Weight | Usage |
|---|---|---|---|---|
| **Page title** | Inter | 24px / 1.33 | 600 | One per page, top-left after breadcrumb |
| **Section heading** | Inter | 18px / 1.44 | 600 | Card titles, section dividers |
| **Table header** | Inter | 13px / 1.38 | 600 | Column headers, uppercase with letter-spacing |
| **Body / table cell** | Inter | 14px / 1.57 | 400 | Primary reading text, form labels |
| **Small / caption** | Inter | 12px / 1.33 | 400 | Timestamps, secondary info, help text |
| **Monospace** | JetBrains Mono | 13px / 1.38 | 400 | Asset tags, serial numbers, employee codes |

### 1.4 Color Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-primary` | `#FFFFFF` | `#1A1A2E` | Page background |
| `--bg-secondary` | `#F7F8FA` | `#16213E` | Card backgrounds, sidebar |
| `--bg-tertiary` | `#EBEDF0` | `#0F3460` | Hover states, table row alternate |
| `--text-primary` | `#1A1A2E` | `#E8E8E8` | Body text |
| `--text-secondary` | `#5E6278` | `#A0A0B0` | Labels, captions, help text |
| `--border` | `#E1E3E8` | `#2A2A4A` | Card borders, dividers |
| `--accent` | `#1B73E8` | `#5B9BF5` | Primary buttons, links, active nav |
| `--accent-hover` | `#1557B0` | `#7DB4F8` | Hover on primary elements |

**Semantic colors (same in both themes):**

| Token | Value | Usage |
|---|---|---|
| `--success` | `#16A34A` | Completed, pass, available |
| `--warning` | `#D97706` | Pending, awaiting, SLA near |
| `--danger` | `#DC2626` | Failed, rejected, SLA breached, errors |
| `--info` | `#2563EB` | Informational badges, links |

### 1.5 Component Library Reference

| Component | Description |
|---|---|
| **StatusBadge** | Pill-shaped badge with semantic color background. Displays status text: `Available` (green), `Allocated` (blue), `Under Repair` (amber), `Disposed` (grey), `Pending` (amber), `Completed` (green), `Cancelled` (grey). |
| **DataTable** | Sortable, paginated table with checkbox selection, row click navigation, column visibility toggle. Fixed header on scroll. |
| **FilterBar** | Horizontal bar above table with dropdowns, search input, date pickers, and a "Clear all" link. |
| **PageHeader** | Breadcrumb + page title + primary action button (top-right). |
| **StatCard** | Compact card with icon, count, label, and optional trend indicator. Used on dashboards. |
| **TimelineEntry** | Vertical timeline node with avatar, action description, timestamp, and optional detail expand. |
| **WorkflowStepper** | Horizontal step indicator showing workflow stages with current-stage highlight, completed checkmarks, and role labels per step. |
| **FormSection** | Grouped form fields with a section heading and optional description. Border-bottom divider. |
| **ConfirmModal** | Centered modal with icon, title, description, and Cancel / Confirm buttons. Red variant for destructive actions. |
| **Toast** | Floating notification in top-right corner. Auto-dismiss after 5s. Types: success, error, warning, info. |
| **EmptyState** | Centered illustration + heading + subtext + primary action button. Used when a table or section has no data. |
| **Skeleton** | Animated placeholder matching the shape of the content being loaded. Used for tables, cards, and detail views. |
| **SignatureBox** | Form component with typed name field, consent checkbox, and timestamp capture. Used for workflow approvals. |

### 1.6 Icon System

Use **Lucide** icon set (open-source, consistent stroke weight). Key icons:

| Context | Icon |
|---|---|
| Assets | `Monitor`, `Laptop`, `Smartphone`, `HardDrive` |
| Employees | `Users`, `UserCircle` |
| Allocations | `PackagePlus`, `ArrowRightLeft` |
| Returns | `PackageMinus`, `Undo2` |
| Assessments | `ClipboardCheck`, `CheckCircle` |
| Repairs | `Wrench`, `Settings` |
| Disposals | `Trash2`, `FileX` |
| Vendors | `Building2`, `Store` |
| Reports | `BarChart3`, `FileText` |
| Dashboard | `LayoutDashboard` |
| Notifications | `Bell`, `BellDot` |
| Audit | `ScrollText`, `Shield` |
| Admin | `Settings`, `UserCog` |
| Search | `Search` |

---

## 2. Global Layout — App Shell

### 2.1 Purpose

The app shell is the persistent frame around every authenticated page. It
provides navigation, identity, search, and notification access without
full-page reloads.

### 2.2 Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR (56px)                                                   │
│ ┌──────┬────────────────┬──────────────────────────────────────┐ │
│ │ ☰    │ Breadcrumb      │  [🔍 Search...  Ctrl+K]  🔔(3)  👤 │ │
│ └──────┴────────────────┴──────────────────────────────────────┘ │
├──────────┬───────────────────────────────────────────────────────┤
│ SIDEBAR  │ PAGE CONTENT                                         │
│ (240px)  │                                                       │
│          │ ┌─────────────────────────────────────────────────┐   │
│ Logo     │ │  Page Header                                    │   │
│ ──────── │ │  [Title]                    [Primary Action ▼]  │   │
│ Dashboard│ └─────────────────────────────────────────────────┘   │
│ Assets   │                                                       │
│ Employees│  ┌─────────────────────────────────────────────────┐  │
│ Workflows│  │                                                 │  │
│  ├ Alloc.│  │                                                 │  │
│  ├ Return│  │           MAIN CONTENT AREA                     │  │
│  ├ Assess│  │                                                 │  │
│  └ Repair│  │                                                 │  │
│ Disposals│  │                                                 │  │
│ Vendors  │  │                                                 │  │
│ ──────── │  │                                                 │  │
│ Reports  │  └─────────────────────────────────────────────────┘  │
│ ──────── │                                                       │
│ Admin ▼  │  ┌─────────────────────────────────────────────────┐  │
│  ├ Users │  │ Pagination: ◄ 1 2 3 ... 8 ►   20 per page ▼   │  │
│  ├ M.Data│  └─────────────────────────────────────────────────┘  │
│  ├ Workfl│                                                       │
│  └ Audit │                                                       │
│ ──────── │                                                       │
│ Complianc│                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

### 2.3 Top Bar Components

| Component | Behavior |
|---|---|
| **Hamburger (☰)** | Toggles sidebar between expanded (240px) and collapsed (64px, icons only). On mobile, opens sidebar as an overlay. |
| **Breadcrumb** | Auto-generated from route. Format: `Dashboard / Assets / AST-0042`. Each segment is a clickable link except the current page. Max 3 levels shown; intermediate levels collapse to `...`. |
| **Global Search** | Click or `Ctrl+K` opens a centered command-palette modal. Type-ahead results grouped by type (Assets, Employees). `Enter` navigates to the top result. `↑↓` to select. `Esc` to close. |
| **Notification Bell** | Badge shows unread count (max display: `9+`). Click opens a dropdown panel (not a full page) with the 10 most recent notifications. Each item shows: icon, subject line, relative time ("3h ago"). Click a notification navigates to its source (e.g., the allocation request). Footer link: "View all notifications." |
| **User Avatar** | Circular avatar with initials fallback. Click opens dropdown: user name, role badge, email, divider, "My Profile," "Change Password," divider, "Logout." |

### 2.4 Sidebar Navigation

The sidebar is role-aware. Items not accessible to the current user's role
are hidden, not greyed out.

| Nav Item | Icon | Route | Visible To |
|---|---|---|---|
| Dashboard | `LayoutDashboard` | `/dashboard` | All |
| Assets | `Monitor` | `/assets` | SA, ST, IT, PC, EM* |
| Employees | `Users` | `/employees` | SA, PC, ST, IT |
| **Workflows** (group) | | | |
| → Allocations | `PackagePlus` | `/allocations` | SA, ST, IT, PC, EM |
| → Returns | `Undo2` | `/returns` | SA, ST, IT, PC, EM* |
| → Assessments | `ClipboardCheck` | `/assessments` | SA, IT, ST |
| → Repairs | `Wrench` | `/repairs` | SA, IT, ST |
| Disposals | `Trash2` | `/disposals` | SA, ST |
| Vendors | `Building2` | `/vendors` | SA, ST, IT |
| Reports | `BarChart3` | `/reports` | SA, PC, ST, IT |
| **Admin** (group) | | | |
| → Users | `UserCog` | `/admin/users` | SA |
| → Master Data | `Database` | `/admin/master-data` | SA |
| → Workflow Config | `GitBranch` | `/admin/workflows` | SA |
| → Audit Logs | `ScrollText` | `/admin/audit-logs` | SA |
| Compliance | `Shield` | `/compliance` | SA, PC |

*EM sees "My Assets" and "My Returns" (same routes, server-scoped).

**Active state:** Left 3px accent-color border + accent background tint on
the active nav item. Group parent auto-expands when a child is active.

**Collapsed state:** Only icons shown. Hover on an icon shows a tooltip with
the label. Groups show a popover menu on hover.

### 2.5 Responsive Behavior

| Breakpoint | Sidebar | Tables | Cards |
|---|---|---|---|
| `≥1440px` | Expanded (240px) | Full columns | Side-by-side stat cards |
| `1024–1439px` | Collapsed (64px, icons) | Reduced columns (hide lower-priority) | Stat cards wrap to 2-per-row |
| `768–1023px` | Hidden (hamburger overlay) | Horizontal scroll | Cards stack vertically |
| `<768px` | Hidden (hamburger overlay) | Replaced by stacked cards | Full-width cards |

---

## 3. Login Page

### 3.1 Purpose

Authenticate users. Single entry point for all roles. No registration —
accounts are created by Super Admin.

### 3.2 Layout

Full-screen, no sidebar or top bar. Two-column layout on desktop:

```
┌────────────────────────┬────────────────────────┐
│                        │                        │
│    BRAND PANEL         │    LOGIN FORM           │
│    (accent bg)         │    (white bg)           │
│                        │                        │
│    Company Logo        │    "Sign in"            │
│    "IT Asset           │                        │
│     Management"        │    ┌──────────────────┐ │
│                        │    │ Email            │ │
│    Illustration        │    └──────────────────┘ │
│    or pattern          │    ┌──────────────────┐ │
│                        │    │ Password     👁  │ │
│                        │    └──────────────────┘ │
│                        │    [    Sign In      ]  │
│                        │                        │
│                        │    Forgot password?     │
│                        │                        │
└────────────────────────┴────────────────────────┘
```

On mobile: single column, brand panel becomes a compact header.

### 3.3 Components

| Component | Details |
|---|---|
| **Email input** | Type: `email`. Placeholder: "you@company.com". Autofocus on page load. |
| **Password input** | Type: `password` with toggle visibility icon (eye/eye-off). |
| **Sign In button** | Full-width primary button. Disabled while submitting. Shows spinner inside button during API call. |
| **Forgot password link** | Below the button, text link. Opens a modal with an email input to trigger a password reset email. |

### 3.4 Forms

| Field | Type | Validation | Error Message |
|---|---|---|---|
| Email | email input | Required, valid email format | "Enter a valid email address" |
| Password | password input | Required, min 8 chars | "Password must be at least 8 characters" |

### 3.5 Buttons

| Button | Type | Action |
|---|---|---|
| **Sign In** | Primary | `POST /auth/login`. On success: store tokens, redirect to Dashboard. On failure: show inline error. |

### 3.6 Validation

- **Client-side:** Real-time validation on blur. Red border + error text below field.
- **Server-side errors:**
  - `INVALID_CREDENTIALS` → Red banner above form: "Invalid email or password."
  - `ACCOUNT_DISABLED` → Red banner: "Your account has been deactivated. Contact your administrator."
  - `429 Rate Limited` → Red banner: "Too many login attempts. Please try again in X minutes."

### 3.7 Error Handling

| Error | Display |
|---|---|
| Network failure | Banner: "Unable to connect to the server. Check your internet connection." Retry button appears. |
| Server 500 | Banner: "Something went wrong. Please try again later." |

### 3.8 Loading States

| State | Display |
|---|---|
| Submitting | Button text changes to "Signing in..." with spinner. Inputs disabled. |
| Token refresh on revisit | Full-page spinner with "Resuming session..." text. If token refresh fails, redirect to login form. |

---

## 4. Dashboard

### 4.1 Purpose

Landing page after login. Shows a role-specific operational summary:
what needs attention, system health at a glance, and recent activity.

### 4.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                            Today ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 350      │ │ 120      │ │ 180      │ │ 15       │          │
│  │ Total    │ │ Available│ │ Allocated│ │ Repair   │          │
│  │ Assets   │ │ ▲ 5      │ │ ▼ 2     │ │ ─ 0     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────────────────────┬──────────────────────────┐       │
│  │ PENDING YOUR ACTION (3)  │ RECENT ACTIVITY           │       │
│  │                          │                            │       │
│  │ ┌────────────────────┐   │ • AST-0042 allocated to   │       │
│  │ │ 📋 Allocation      │   │   Jane Smith — 2h ago     │       │
│  │ │ New device request  │   │ • Return initiated for    │       │
│  │ │ from Jane Smith     │   │   EMP-0024 — 4h ago      │       │
│  │ │ Stage: P&C Review   │   │ • Assessment completed    │       │
│  │ │ Waiting 2h          │   │   for AST-0018 — 1d ago  │       │
│  │ │ [Review →]          │   │                            │       │
│  │ └────────────────────┘   │                            │       │
│  │                          │                            │       │
│  │ ┌────────────────────┐   │                            │       │
│  │ │ 🔧 Assessment      │   │                            │       │
│  │ │ IT Assessment for   │   │                            │       │
│  │ │ AST-0018            │   │                            │       │
│  │ │ [Assess →]          │   │                            │       │
│  │ └────────────────────┘   │                            │       │
│  └──────────────────────────┴──────────────────────────┘       │
│                                                                 │
│  ┌──────────────────────────┬──────────────────────────┐       │
│  │ ASSETS BY STATUS         │ MONTHLY ALLOCATIONS       │       │
│  │ (Donut chart)            │ (Bar chart, 12 months)    │       │
│  │                          │                            │       │
│  └──────────────────────────┴──────────────────────────┘       │
│                                                                 │
│  ┌──────────────────────────┬──────────────────────────┐       │
│  │ ASSETS BY DEPARTMENT     │ ASSETS BY DEVICE TYPE     │       │
│  │ (Horizontal bar chart)   │ (Pie chart)               │       │
│  └──────────────────────────┴──────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Components

**Stat Cards Row (top):**

| Card | Value Source | Trend | Click Action |
|---|---|---|---|
| Total Assets | `GET /dashboard/summary` → `total` | — | Navigate to `/assets` |
| Available | `summary.available` | vs last month | Navigate to `/assets?status=available` |
| Allocated | `summary.allocated` | vs last month | Navigate to `/assets?status=allocated` |
| Under Repair | `summary.underRepair` | vs last month | Navigate to `/assets?status=under_repair` |
| Disposed | `summary.disposed` | — | Navigate to `/assets?status=disposed` |
| Lost / Stolen | `summary.lost + summary.stolen` | — (danger color if > 0) | Navigate to `/assets?status=lost,stolen` |

For **EM role:** Cards show: "My Devices" (count of allocated), "My Pending Requests," "My Returns."

**Pending Your Action Panel:**

- Source: `GET /dashboard/pending`
- Groups: `pendingApprovals`, `pendingAssessments`, `pendingReturns`, `pendingRequests`
- Each item is a card with: icon, type label, description, workflow stage name, waiting duration, action button
- Action button navigates to the detail page with the workflow panel open
- If nothing pending: show green checkmark + "All caught up — no items need your attention"

**Recent Activity Feed:**

- Source: `GET /dashboard/activity?limit=10`
- Vertical list with avatar, description, and relative timestamp
- Each item is a link to the relevant resource
- Auto-refreshes every 60 seconds (silent, no spinner)

**Charts (2×2 grid):**

| Chart | Type | Source |
|---|---|---|
| Assets by Status | Donut chart | `GET /dashboard/charts/by-status` |
| Monthly Allocations | Vertical bar chart (12 bars) | `GET /dashboard/charts/monthly-allocations` |
| Assets by Department | Horizontal bar chart | `GET /dashboard/charts/by-department` |
| Assets by Device Type | Pie chart | `GET /dashboard/charts/by-type` |

Charts have tooltips on hover showing exact values. Legend below each chart.
Charts are clickable — clicking a segment navigates to the filtered asset list.

### 4.4 Role-Specific Views

| Role | Stat Cards | Pending Panel | Charts |
|---|---|---|---|
| **Super Admin** | All 6 cards | All pending types | All 4 charts |
| **Stores Officer** | Total, Available, Allocated, Repair | Pending allocations (stores stages), pending returns | By Status, By Type |
| **IT Representative** | Total, Repair, Allocated | Pending assessments | By Status, Monthly allocations |
| **P&C** | Total, Allocated, Available | Pending approvals, pending returns (P&C stages) | By Department, Monthly allocations |
| **Employee** | My Devices, My Requests | Own pending requests | None |

### 4.5 Loading States

- **Initial load:** Skeleton cards (4 rectangles) + skeleton table rows in pending panel + skeleton chart containers
- **Chart loading:** Grey rounded rectangle with shimmer animation, same dimensions as the chart
- **Activity feed:** Skeleton timeline entries (avatar circle + text line placeholders)

### 4.6 Empty States

| Section | Message | Action |
|---|---|---|
| Pending panel | "All caught up — no items need your attention" | None |
| Activity feed | "No recent activity" | None |
| Charts (no data) | "No data yet" within the chart container | None |
| EM with no assets | "You don't have any assigned devices yet" | "Request a device" button |

---

## 5. Asset List Page

### 5.1 Purpose

Central inventory view. Browse, filter, search, and manage all registered
assets. The most data-dense page in the application.

### 5.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Assets / All Assets                        [+ Register Asset] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [🔍 Search assets...]  Status ▼  Type ▼  Brand ▼  Dept ▼  ││
│  │                        Office ▼  Vendor ▼  [Clear filters] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 350 assets                          [Columns ▼] [⬇ Export]│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │☐│ Asset Tag   │ Type    │ Brand  │ Model          │Status  ││
│  │──────────────────────────────────────────────────────────────│
│  │☐│ AST-0042    │ Laptop  │ Lenovo │ ThinkPad T14   │🟢 In Use│
│  │☐│ AST-0041    │ Laptop  │ Dell   │ Latitude 5540  │🟢 Avail.│
│  │☐│ AST-0040    │ Phone   │ Apple  │ iPhone 15 Pro  │🟡 Repair│
│  │  │ ...         │         │        │                │        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ◄ 1 2 3 ... 18 ►                          20 per page ▼      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Components

**Page Header:**
- Breadcrumb: `Dashboard / Assets`
- Title: "Assets"
- Primary action: "+ Register Asset" button (visible to SA, ST only)

**Summary bar (above table):**
- Left: "Showing X assets" (filtered count / total)
- Right: Column visibility toggle dropdown, Export button (CSV/Excel)

### 5.4 Table

| Column | Width | Sortable | Content |
|---|---|---|---|
| ☐ (checkbox) | 40px | No | Bulk selection for future batch operations |
| Asset Tag | 120px | Yes | Monospace font. Click navigates to detail page. |
| Serial Number | 130px | Yes | Monospace. Truncated with tooltip if >15 chars. |
| Device Type | 100px | Yes | e.g., "Laptop," "Phone," "Monitor" |
| Brand | 100px | Yes | e.g., "Lenovo," "Dell," "Apple" |
| Model | 160px | Yes | Free text from registration |
| Status | 110px | Yes | StatusBadge component with color coding |
| Current Holder | 150px | Yes | Employee name (link to employee detail) or "—" if none |
| Department | 120px | Yes | Department name |
| Office | 100px | Yes | Office name |
| Purchase Date | 100px | Yes | `YYYY-MM-DD` format |
| Warranty Expiry | 110px | Yes | Date with red text if expired or expiring within 30 days |
| Actions | 60px | No | `⋯` kebab menu |

**Default sort:** `createdAt DESC` (newest first).

**Row click:** Navigates to asset detail page.

**Kebab menu actions:**

| Action | Visible To | Icon |
|---|---|---|
| View Details | All | `Eye` |
| Edit | SA, ST | `Pencil` |
| Print Barcode | SA, ST, IT | `QrCode` |
| View History | SA, ST, IT, PC | `History` |

### 5.5 Filters

| Filter | Type | Options |
|---|---|---|
| Search | Text input with debounce (300ms) | Searches: assetTag, serialNumber, IMEI, model |
| Status | Multi-select dropdown | `registered`, `available`, `reserved`, `allocated`, `in_use`, `returned`, `under_repair`, `lost`, `stolen`, `disposed` |
| Device Type | Select dropdown | Populated from `GET /master-data/device-types` |
| Brand | Select dropdown | Populated from `GET /master-data/brands` |
| Department | Select dropdown | Populated from `GET /master-data/departments` |
| Office | Select dropdown | Populated from `GET /master-data/offices` |
| Vendor | Select dropdown | Populated from `GET /vendors` |
| Warranty Expiring | Toggle switch | When on: adds `warrantyExpiring=true` |

**Filter behavior:**
- All filters are AND-combined
- Filters update the URL query params (shareable links)
- Count updates instantly as filters are applied
- "Clear filters" resets all to defaults

### 5.6 Search

- Positioned as the first element in the filter bar
- Search icon + placeholder: "Search by tag, serial number, model..."
- 300ms debounce before API call
- Highlights matching text in results (bold matched substring)
- `Esc` clears the search input

### 5.7 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Barcode/QR Print** | Kebab → "Print Barcode" | Preview of barcode/QR image. Toggle between QR and barcode. Size selector. "Print" and "Download PNG" buttons. |
| **Bulk Export** | "Export" button | Format selector (CSV, Excel). Option to export filtered results or all. Progress bar for large exports. |
| **Column Visibility** | "Columns" button | Checkbox list of all columns. Drag to reorder. "Reset to defaults" link. |

### 5.8 User Actions

| Action | Role | Trigger | API Call |
|---|---|---|---|
| Register new asset | SA, ST | "+ Register Asset" button | Navigate to `/assets/new` |
| View asset detail | All | Row click or kebab → View | Navigate to `/assets/:id` |
| Edit asset | SA, ST | Kebab → Edit | Navigate to `/assets/:id/edit` |
| Print barcode | SA, ST, IT | Kebab → Print Barcode | `GET /assets/:id/barcode` |
| Export list | SA, ST, IT, PC | Export button | `GET /reports/inventory/export` |

### 5.9 Loading States

| State | Display |
|---|---|
| Initial page load | Table skeleton: 10 rows of shimmer blocks matching column widths |
| Filter change | Subtle opacity fade (0.5) on table body + spinner overlay. Filter bar stays interactive. |
| Pagination | Table body fades and replaces. Scroll position resets to top of table. |

### 5.10 Empty States

| Condition | Message | Action |
|---|---|---|
| No assets registered (fresh system) | Icon: `Monitor` outline. Heading: "No assets registered yet." Subtext: "Register your first asset to start tracking your inventory." | "+ Register Asset" button (SA, ST) |
| Filters return no results | Icon: `SearchX`. Heading: "No assets match your filters." Subtext: "Try adjusting your search or filter criteria." | "Clear filters" link |
| EM with no assigned assets | Icon: `PackageOpen`. Heading: "No devices assigned to you." Subtext: "Submit an allocation request to get started." | "Request a Device" button |

---

## 6. Asset Detail Page

### 6.1 Purpose

Complete view of a single asset: metadata, current holder, accessories,
status history, and related workflows. The single source of truth for
"what is this asset and where has it been."

### 6.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Assets / AST-0042                     [Edit] [Print Barcode]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AST-0042 · ThinkPad T14 Gen 3            🟢 In Use     │   │
│  │  Lenovo · Laptop                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Overview] [Accessories (3)] [History] [Workflows]             │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  OVERVIEW TAB:                                                  │
│  ┌───────────────────────────┬───────────────────────────┐      │
│  │ ASSET INFORMATION         │ ASSIGNMENT                │      │
│  │                           │                           │      │
│  │ Asset Tag    AST-0042     │ Current Holder            │      │
│  │ Serial No.   PF3KL789    │ ┌─────────────────────┐   │      │
│  │ Device Type  Laptop       │ │ 👤 Jane Smith       │   │      │
│  │ Brand        Lenovo       │ │ EMP-0042            │   │      │
│  │ Model        ThinkPad T14 │ │ Engineering         │   │      │
│  │ IMEI         —            │ │ Lagos HQ            │   │      │
│  │                           │ │ Allocated: Sep 2025 │   │      │
│  │ PROCUREMENT               │ │ [View Employee →]   │   │      │
│  │ Purchase Date  2025-06-01 │ └─────────────────────┘   │      │
│  │ Purchase Price ₦450,000   │                           │      │
│  │ Vendor        Lenovo NG   │ LOCATION                  │      │
│  │ Warranty      Jun 2027    │ Department  Engineering   │      │
│  │                           │ Office      Lagos HQ      │      │
│  │ Notes                     │                           │      │
│  │ Procured for team expansion│                          │      │
│  └───────────────────────────┴───────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Components

**Header Card:**
- Asset tag (large, monospace), model name, StatusBadge
- Brand and device type as subtitle
- Action buttons top-right: "Edit" (SA, ST), "Print Barcode" (SA, ST, IT)

**Tab Bar:**

| Tab | Content | Badge |
|---|---|---|
| **Overview** | Two-column key-value card with asset info + assignment info | — |
| **Accessories** | Table of accessories (name, serial number, condition, notes) | Count: e.g., "(3)" |
| **History** | Timeline of all status changes and workflow transitions | — |
| **Workflows** | List of all workflow instances involving this asset | — |

### 6.4 Tabs

**Overview Tab:**
- Left column: Asset metadata (tag, serial, device type, brand, model, IMEI, purchase info, warranty, notes)
- Right column: Current holder card (avatar, name, employee code, department, office, allocation date, link to employee detail). If no holder: "Unassigned" with grey text.
- Warranty expiry highlighted in red if expired or within 30 days

**Accessories Tab:**

| Column | Content |
|---|---|
| Name | e.g., "65W USB-C Charger" |
| Serial Number | Monospace, or "—" if none |
| Condition | StatusBadge: `good` (green), `fair` (amber), `damaged` (red), `missing` (grey) |
| Notes | Free text |
| Actions | Edit, Delete (SA, ST only) |

- "+ Add Accessory" button above table (SA, ST)
- Edit opens an inline row editor or a small modal

**History Tab:**
- Vertical timeline (newest first)
- Each entry: timestamp, user avatar + name, action description, from-status → to-status badges
- Source: `GET /assets/:id/history`
- Example entry: `Jul 3, 2026 · Admin User · Status changed from Available → In Use via Allocation workflow`

**Workflows Tab:**
- Table of workflow instances involving this asset

| Column | Content |
|---|---|
| Type | "Allocation", "Return", "Assessment" |
| Reference | Link to the allocation/return/assessment detail |
| Stage | Current stage name |
| Status | StatusBadge |
| Created | Date |
| Completed | Date or "—" |

### 6.5 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Add Accessory** | "+ Add Accessory" button | Form: Name (required), Serial Number (optional), Condition (select), Notes (textarea). Save / Cancel. |
| **Edit Accessory** | Accessory row → Edit | Same form, pre-populated. Save / Cancel. |
| **Delete Accessory** | Accessory row → Delete | ConfirmModal: "Remove this accessory? This action cannot be undone." |
| **Barcode Preview** | "Print Barcode" button | QR/barcode image, format toggle, size slider, Print / Download buttons. |

### 6.6 User Actions

| Action | Role | Effect |
|---|---|---|
| Edit asset | SA, ST | Navigate to `/assets/:id/edit` |
| Add accessory | SA, ST | Open Add Accessory modal → `POST /assets/:id/accessories` |
| Edit accessory | SA, ST | Open Edit Accessory modal → `PATCH /assets/:id/accessories/:accId` |
| Delete accessory | SA, ST | Confirm → `DELETE /assets/:id/accessories/:accId` |
| Print barcode | SA, ST, IT | Open Barcode modal → `GET /assets/:id/barcode` |
| View employee | All | Click employee name → navigate to `/employees/:id` |
| View workflow | All | Click workflow row → navigate to workflow detail |

### 6.7 Validation

- Accessory name: required, max 100 chars
- Accessory serial number: optional, max 100 chars
- On duplicate serial number: toast error "Serial number already in use"

### 6.8 Error Handling

| Error | Display |
|---|---|
| Asset not found (404) | Full-page: "Asset not found. It may have been removed or you may not have access." Back to Assets link. |
| Version conflict on edit | Toast: "This asset was modified by another user. Refresh to see the latest version." Refresh button. |
| Network failure | Retry banner at top of content area. |

### 6.9 Loading States

| State | Display |
|---|---|
| Initial load | Skeleton: header card placeholder + tab content skeleton |
| Tab switch | Content area skeleton while new tab data loads |
| History load | Timeline skeleton (3-4 placeholder entries) |

### 6.10 Empty States

| Section | Message |
|---|---|
| Accessories tab, no items | "No accessories registered for this asset." + "Add Accessory" button |
| History tab, no entries | "No status changes recorded yet." |
| Workflows tab, no workflows | "No workflows have been initiated for this asset." |
| No current holder | Assignment card shows: "Currently unassigned" with outline icon |

---

## 7. Asset Create / Edit Form

### 7.1 Purpose

Register a new asset or edit an existing asset's metadata. Multi-section form
with validation. Status changes are NOT done here — they go through workflows.

### 7.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Assets / Register New Asset                    [Cancel] [Save]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDENTIFICATION                                                 │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │ Asset Tag *          │ │ Serial Number         │             │
│  │ AST-                 │ │                       │             │
│  └──────────────────────┘ └──────────────────────┘             │
│  ┌──────────────────────┐                                      │
│  │ IMEI                 │                                      │
│  └──────────────────────┘                                      │
│  ─────────────────────────────────────────────────              │
│  CLASSIFICATION                                                 │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │ Device Type *  ▼     │ │ Brand *         ▼    │             │
│  └──────────────────────┘ └──────────────────────┘             │
│  ┌──────────────────────┐                                      │
│  │ Model *              │                                      │
│  └──────────────────────┘                                      │
│  ─────────────────────────────────────────────────              │
│  LOCATION                                                       │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │ Department       ▼   │ │ Office           ▼   │             │
│  └──────────────────────┘ └──────────────────────┘             │
│  ─────────────────────────────────────────────────              │
│  PROCUREMENT                                                    │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │ Purchase Date  📅    │ │ Purchase Amount       │             │
│  └──────────────────────┘ └──────────────────────┘             │
│  ┌──────────────────────┐ ┌──────────────────────┐             │
│  │ Currency   ▼  NGN   │ │ Vendor          ▼    │             │
│  └──────────────────────┘ └──────────────────────┘             │
│  ┌──────────────────────┐                                      │
│  │ Warranty Expiry  📅  │                                      │
│  └──────────────────────┘                                      │
│  ─────────────────────────────────────────────────              │
│  ACCESSORIES (optional)                                         │
│  ┌──────────────────────────────────────────────┐              │
│  │ Name          │ Serial No.   │ [✕]           │              │
│  │ 65W Charger   │ CHG-001      │ [✕]           │              │
│  │ Laptop Bag    │              │ [✕]           │              │
│  └──────────────────────────────────────────────┘              │
│  [+ Add another accessory]                                     │
│  ─────────────────────────────────────────────────              │
│  NOTES                                                          │
│  ┌──────────────────────────────────────────────┐              │
│  │ (textarea)                                    │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
│                                        [Cancel]  [Save Asset]  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Forms

| Section | Field | Type | Required | Validation |
|---|---|---|---|---|
| **Identification** | Asset Tag | Text | Yes | Max 50, unique |
| | Serial Number | Text | No | Max 100, unique if provided |
| | IMEI | Text | No | Max 20, unique if provided |
| **Classification** | Device Type | Select dropdown | Yes | Must exist |
| | Brand | Select dropdown | Yes | Must exist |
| | Model | Text | Yes | Max 100 |
| **Location** | Department | Select dropdown | No | Must exist |
| | Office | Select dropdown | No | Must exist |
| **Procurement** | Purchase Date | Date picker | No | Valid date |
| | Purchase Amount | Number input | No | Non-negative |
| | Currency | Select | No | Default: NGN |
| | Vendor | Select dropdown + search | No | Must exist |
| | Warranty Expiry | Date picker | No | Must be after purchase date |
| **Accessories** | Name | Text | Yes (per row) | Max 100 |
| | Serial Number | Text | No | Max 100 |
| **Notes** | Notes | Textarea | No | — |

### 7.4 Buttons

| Button | Position | Action |
|---|---|---|
| **Save Asset** / **Save Changes** | Bottom-right and top-right | Validate → `POST /assets` (create) or `PATCH /assets/:id` (edit). On success: toast "Asset registered successfully" + navigate to detail page. |
| **Cancel** | Bottom-right and top-right | If form is dirty: confirm modal "Discard unsaved changes?" Otherwise navigate back. |
| **+ Add another accessory** | Below accessories list | Adds a new empty row to the accessories dynamic list. |
| **✕ (remove accessory)** | Per accessory row | Removes the row. No confirmation needed for unsaved rows. |

### 7.5 Validation

- Real-time on blur for each field
- Red border + error message below field
- Scroll to first error on submit attempt
- Unique checks (assetTag, serialNumber, IMEI) validated on blur via a debounced API uniqueness check — shows "✓ Available" or "✕ Already in use"
- Edit mode: `version` field is sent with the request for optimistic locking

### 7.6 Error Handling

| Error | Display |
|---|---|
| `DUPLICATE_ASSET_TAG` (409) | Inline error on Asset Tag field: "This asset tag is already in use" |
| `DUPLICATE_SERIAL_NUMBER` (409) | Inline error on Serial Number field |
| `VERSION_CONFLICT` (409) | Modal: "This asset was modified by someone else while you were editing. Your changes were not saved." Options: "Reload & Lose My Changes" / "Copy My Changes to Clipboard" |
| `DEVICE_TYPE_NOT_FOUND` (404) | Inline error on device type dropdown (shouldn't happen unless master data deleted) |
| Network failure | Toast: "Failed to save. Check your connection and try again." Form stays populated. |

### 7.7 Loading States

| State | Display |
|---|---|
| Dropdown options loading | Dropdown shows spinner inside, "Loading..." text |
| Form submitting | Save button shows spinner, all inputs disabled |
| Edit mode: loading existing data | Skeleton form (placeholder blocks in each field position) |

---

## 8. Employee List Page

### 8.1 Purpose

Browse and manage employee records. Linked to user accounts and asset
assignments.

### 8.2 Components

**Page Header:**
- Title: "Employees"
- Primary action: "+ Add Employee" (SA, PC only)

### 8.3 Table

| Column | Sortable | Content |
|---|---|---|
| Employee Code | Yes | Monospace. Link to detail page. |
| Name | Yes | `lastName, firstName` format |
| Email | Yes | Email address |
| Department | Yes | Department name |
| Designation | Yes | Job title |
| Office | Yes | Office name |
| Status | Yes | StatusBadge: `active` (green), `on_leave` (amber), `terminated` (grey), `resigned` (grey), `transferred` (blue) |
| Assets | Yes | Count of currently assigned assets. Click navigates to employee detail → Assets tab |
| Actions | No | Kebab: View, Edit (SA, PC), View Assets |

**Default sort:** `lastName ASC`.

### 8.4 Filters

| Filter | Type | Options |
|---|---|---|
| Search | Text (debounced) | Searches: name, email, employeeCode |
| Department | Select dropdown | From master data |
| Office | Select dropdown | From master data |
| Employment Status | Multi-select | `active`, `on_leave`, `terminated`, `resigned`, `transferred` |

### 8.5 Empty States

| Condition | Message | Action |
|---|---|---|
| No employees | "No employees registered. Add your first employee to get started." | "+ Add Employee" button |
| No filter results | "No employees match your criteria. Try adjusting your filters." | "Clear filters" |

---

## 9. Employee Detail Page

### 9.1 Purpose

Full profile of an employee: personal info, assigned assets, and full
asset allocation/return history.

### 9.2 Components

**Header Card:**
- Avatar (initials), full name, employee code, StatusBadge
- Designation, department, office
- Action buttons: "Edit" (SA, PC)

**Tab Bar:**

| Tab | Content | Badge |
|---|---|---|
| **Profile** | Two-column info card: personal details + employment details | — |
| **Assigned Assets** | Table of currently assigned assets | Count |
| **Asset History** | Timeline of all allocations and returns | — |

### 9.3 Tabs

**Profile Tab:**

Left column:
- Employee Code, Email, Hire Date, Manager (link to their profile)

Right column:
- Department, Designation, Office, Employment Status
- Termination Date (if applicable, shown in red)
- Linked User Account (email, last login — link to user management)

**Assigned Assets Tab:**

| Column | Content |
|---|---|
| Asset Tag | Monospace, link to asset detail |
| Device Type | e.g., "Laptop" |
| Model | e.g., "ThinkPad T14 Gen 3" |
| Allocated On | Date |
| Accessories | Comma-separated list of accessory names |
| Actions | "View Asset" link |

**Asset History Tab:**
- Vertical timeline (newest first)
- Each entry: date, action badge ("Allocated" in blue, "Returned" in amber), asset tag + model, workflow link

### 9.4 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Initiate Return** | Button on Assigned Assets tab (SA, PC) | Confirmation + navigate to return form pre-filled with this employee |

### 9.5 User Actions

| Action | Role | Effect |
|---|---|---|
| Edit employee | SA, PC | Navigate to `/employees/:id/edit` |
| View assigned asset | All | Navigate to asset detail |
| Initiate return | SA, PC | Navigate to `/returns/new?employeeId=:id` |

### 9.6 Empty States

| Tab | Message |
|---|---|
| Assigned Assets, none | "No devices currently assigned to this employee." + "Submit Allocation Request" button |
| Asset History, none | "No asset history found for this employee." |

---

## 10. Employee Create / Edit Form

### 10.1 Purpose

Add a new employee or edit existing employee details. Links to user accounts
for system access.

### 10.2 Forms

| Section | Field | Type | Required | Validation |
|---|---|---|---|---|
| **Personal** | Employee Code | Text | Yes | Max 50, unique |
| | First Name | Text | Yes | Max 100 |
| | Last Name | Text | Yes | Max 100 |
| | Email | Email | Yes | Valid email, max 255, unique |
| **Employment** | Department | Select | Yes | Must exist |
| | Designation | Text | Yes | Max 100 |
| | Manager | Searchable select | No | Must exist, cannot be self |
| | Office | Select | Yes | Must exist |
| | Hire Date | Date picker | Yes | Valid date |
| | Employment Status | Select | Edit only | `active`, `on_leave`, `terminated`, `resigned`, `transferred` |
| | Termination Date | Date picker | Conditional | Required when status = terminated/resigned |
| **System Access** | Link User Account | Searchable select | No | Must exist, must not be linked to another employee |

### 10.3 Buttons

| Button | Action |
|---|---|
| **Save** | `POST /employees` or `PATCH /employees/:id`. On success: navigate to detail page. |
| **Cancel** | Dirty check → navigate back. |

### 10.4 Validation

- Employee code uniqueness checked on blur (debounced API call)
- Manager field excludes the current employee (no self-reference)
- Termination Date field appears dynamically when status is set to `terminated` or `resigned`
- User account dropdown shows only unlinked users

### 10.5 Error Handling

| Error | Display |
|---|---|
| `DUPLICATE_EMPLOYEE_CODE` | Inline on employee code field |
| `DUPLICATE_EMAIL` | Inline on email field |
| `USER_ALREADY_LINKED` | Inline on user account field: "This user is already linked to another employee" |
| `SELF_REFERENCING_MANAGER` | Inline on manager field: "An employee cannot be their own manager" |
| `TERMINATION_DATE_REQUIRED` | Inline: "Termination date is required when status is terminated or resigned" |

---

## 11. Allocation List Page

### 11.1 Purpose

Track all asset allocation requests and their workflow progress. Primary
view for P&C, Stores, and IT to see what needs their action.

### 11.2 Components

**Page Header:**
- Title: "Allocations"
- Primary action: "+ New Request" (SA, EM)

### 11.3 Table

| Column | Sortable | Content |
|---|---|---|
| ID | No | Short UUID (first 8 chars), link to detail |
| Employee | Yes | Name + employee code |
| Request Type | Yes | Badge: `new_device`, `repair`, `replacement`, `additional_device`, `accessory` |
| Justification | No | Truncated to 60 chars, tooltip for full text |
| Selected Asset | Yes | Asset tag (link) or "Pending selection" |
| Current Stage | Yes | Stage name with role indicator |
| Status | Yes | StatusBadge: `pending` (amber), `in_progress` (blue), `completed` (green), `cancelled` (grey) |
| Created | Yes | Relative time ("2 days ago") with absolute tooltip |
| Updated | Yes | Relative time |
| Actions | No | Kebab: View, Cancel (if permitted) |

**Default sort:** `updatedAt DESC`.

### 11.4 Filters

| Filter | Type | Options |
|---|---|---|
| Search | Text | Employee name, employee code |
| Status | Multi-select | `pending`, `in_progress`, `completed`, `cancelled` |
| Request Type | Multi-select | `new_device`, `repair`, `replacement`, `additional_device`, `accessory` |
| Employee | Searchable select | For SA/PC/ST/IT only |

### 11.5 Tabs (above table)

| Tab | Filter Applied | Badge |
|---|---|---|
| **All** | None | Total count |
| **Needs My Action** | Filter to items where current stage's required role matches user's role | Count |
| **In Progress** | `status=in_progress` | Count |
| **Completed** | `status=completed` | Count |

### 11.6 User Actions

| Action | Role | Effect |
|---|---|---|
| New request | SA, EM | Navigate to new allocation form |
| View detail | All | Navigate to allocation detail |
| Cancel | SA, PC, EM (own, at first stage) | Confirm modal → `POST /allocations/:id/cancel` |

### 11.7 Empty States

| Condition | Message | Action |
|---|---|---|
| No allocations | "No allocation requests yet. Submit a request to get started." | "+ New Request" button |
| "Needs My Action" tab empty | "No requests waiting for your action. You're all caught up." | — |
| No filter matches | "No allocations match your filters." | "Clear filters" |

---

## 12. Allocation Detail Page

### 12.1 Purpose

Full view of a single allocation request with its workflow state,
transition history, and action controls. This is where reviewers
approve/advance the request.

### 12.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Allocations / ALQ-8f3a2b...            [Cancel Request]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WORKFLOW PROGRESS                                       │   │
│  │  ──────────────────────────────────────────────           │   │
│  │  ✓ P&C Review  ✓ Stores Select  ● IT Assessment          │   │
│  │  ○ Emp. Sign   ○ P&C Sign      ○ IT Sign     ○ Complete  │   │
│  │                                                           │   │
│  │  Current Stage: IT Assessment                             │   │
│  │  Required Role: IT Representative                         │   │
│  │  Waiting: 4 hours                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┬──────────────────────────┐       │
│  │ REQUEST DETAILS          │ ACTION PANEL              │       │
│  │                          │                            │       │
│  │ Employee:                │ ┌────────────────────────┐ │       │
│  │  Jane Smith (EMP-0042)   │ │ IT Assessment          │ │       │
│  │  Engineering             │ │                        │ │       │
│  │                          │ │ Link an assessment     │ │       │
│  │ Request Type:            │ │ record for AST-0042:   │ │       │
│  │  New Device              │ │                        │ │       │
│  │                          │ │ Assessment ▼           │ │       │
│  │ Justification:           │ │ [Create Assessment]    │ │       │
│  │  New hire equipment for  │ │                        │ │       │
│  │  onboarding on Jul 15    │ │ ────────────────────── │ │       │
│  │                          │ │ [Advance to Next Stage]│ │       │
│  │ Selected Asset:          │ └────────────────────────┘ │       │
│  │  AST-0042 (ThinkPad T14) │                            │       │
│  │  S/N: PF3KL789          │                            │       │
│  │  [View Asset →]          │                            │       │
│  └──────────────────────────┴──────────────────────────┘       │
│                                                                 │
│  TRANSITION HISTORY                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ● Jul 3, 14:00 · Stores Officer                         │   │
│  │   Stores Select → IT Assessment                          │   │
│  │   Selected asset: AST-0042                               │   │
│  │                                                           │   │
│  │ ● Jul 2, 10:00 · HR Manager                             │   │
│  │   P&C Review → Stores Select                             │   │
│  │   "Approved — new hire provisioning"                      │   │
│  │                                                           │   │
│  │ ● Jul 1, 08:00 · Jane Smith                             │   │
│  │   → P&C Review (request submitted)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.3 Components

**Workflow Stepper:**
- Horizontal multi-step indicator at the top
- Each step: circle icon (✓ completed, ● current, ○ future), stage name, required role below
- Current stage is highlighted with accent color and subtle pulse animation
- On hover: tooltip with SLA info ("SLA: 24 hours, 4 hours elapsed")
- Bypassed stages shown with a skip-forward icon and amber color

**Request Details Panel (left):**
- Key-value pairs: Employee (link), Request Type (badge), Justification (full text), Requested Asset / Selected Asset (link to asset detail)
- If in edit-capable stage: editable fields shown inline

**Action Panel (right):**
- Visible only if the current user's role matches the stage's required role
- Content changes per stage:

| Stage | Action Panel Content |
|---|---|
| `pc_review` | Reason textarea + "Approve & Advance" button + "Reject" button (red) |
| `stores_select` | Asset selector (searchable dropdown of available assets) + "Select & Advance" button |
| `it_assessment` | Assessment selector (or "Create New Assessment" button) + "Advance" button |
| `employee_signature` | SignatureBox (typed name + consent checkbox) + "Sign & Advance" |
| `pc_signature` | SignatureBox + "Sign & Advance" |
| `it_signature` | SignatureBox + "Sign & Advance" |

If user's role does NOT match: the panel shows "Waiting for [Role Name] to complete this step" with the assigned role's label.

**Transition History:**
- Vertical timeline (newest first)
- Each entry: timestamp, user name + avatar, from-stage → to-stage, reason (if provided), bypass flag (amber badge "Bypassed")
- Signature entries show: "Signed by [Name]" with a checkmark icon

### 12.4 Workflow

The page is the primary workflow interface. The allocation workflow stages:

1. **P&C Review** — P&C reviews the request, approves or rejects
2. **Stores Select Asset** — Stores picks an available asset from inventory
3. **IT Assessment** — IT performs technical assessment
4. **Employee Signature** — Employee signs to acknowledge receipt
5. **P&C Signature** — P&C signs to confirm handover
6. **IT Signature** — IT signs to confirm technical handoff
7. **Complete** — Workflow closes, asset status → `allocated`/`in_use`

### 12.5 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Cancel Confirmation** | "Cancel Request" button | "Cancel this allocation request? The reserved asset (if any) will be released back to inventory." Reason textarea (required). Confirm / Back. |
| **Reject Confirmation** | "Reject" button in P&C Review | "Reject this allocation request? The employee will be notified." Reason textarea (required). Confirm / Back. |
| **Bypass Confirmation** | "Bypass" link (SA only, shown in current stage header) | "Bypass the remaining stages? This will be flagged in the audit log and compliance reports." Reason textarea (required). Target stage select. Confirm / Back. |

### 12.6 User Actions

| Action | Role | Stage Requirement | API Call |
|---|---|---|---|
| Approve & advance | PC | `pc_review` | `POST /allocations/:id/transition` |
| Select asset & advance | ST | `stores_select` | `POST /allocations/:id/transition` with `selectedAssetId` |
| Link assessment & advance | IT | `it_assessment` | `POST /allocations/:id/transition` with `assessmentId` |
| Sign & advance | EM, PC, IT | Respective signature stages | `POST /allocations/:id/transition` with `signature` |
| Reject | PC | `pc_review` | `POST /allocations/:id/transition` (rejection path) |
| Cancel | SA, PC, EM (own) | Any stage | `POST /allocations/:id/cancel` |
| Bypass | SA | Any stage | `POST /allocations/:id/transition` with `bypass=true` |

### 12.7 Validation

| Field | Rule | Error |
|---|---|---|
| Reason (reject/cancel) | Required, min 5 chars | "Please provide a reason (at least 5 characters)" |
| Asset selector (stores_select) | Required, must be available | "Please select an available asset" |
| Assessment selector (it_assessment) | Required, must be completed | "A completed assessment is required" |
| Signature name | Required, max 200 | "Full name is required" |
| Signature consent | Must be checked | "You must confirm to proceed" |

### 12.8 Error Handling

| Error | Display |
|---|---|
| `INVALID_TRANSITION` | Toast: "This workflow step is no longer available. The request may have been updated by another user." Refresh page. |
| `INSUFFICIENT_ROLE` | Toast: "You don't have permission to perform this action at this stage." |
| `ASSET_NOT_AVAILABLE` | Toast: "The selected asset is no longer available. It may have been allocated to someone else." Asset dropdown refreshes. |
| `VERSION_CONFLICT` | Toast: "This request was updated concurrently. Refreshing..." Auto-refresh. |
| `WORKFLOW_NOT_ACTIVE` | Redirect to detail page with updated status shown. |

### 12.9 Loading States

| State | Display |
|---|---|
| Page load | Workflow stepper skeleton + detail panel skeleton + timeline skeleton |
| Transition in progress | Action button shows spinner + "Processing..." All buttons disabled. |
| Asset dropdown loading | Spinner inside dropdown, "Loading available assets..." |

---

## 13. New Allocation Request Form

### 13.1 Purpose

Submit a new asset allocation request. Kicks off the allocation workflow.
Available to Employees (for themselves) and Super Admin (for any employee).

### 13.2 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| Request Type | Select | Yes | `new_device`, `repair`, `replacement`, `additional_device`, `accessory` |
| Justification | Textarea | Yes | Min 10, max 2000 chars. Character counter shown. |
| Preferred Asset | Searchable select | No | Shows available assets. Filtered by device type. |

For SA: additional field:
| Employee | Searchable select | Yes | Must have an employee profile |

### 13.3 Buttons

| Button | Action |
|---|---|
| **Submit Request** | `POST /allocations`. On success: navigate to allocation detail page + toast "Request submitted. It will be reviewed by People & Culture." |
| **Cancel** | Navigate back to allocation list |

### 13.4 Validation

- Justification: minimum 10 characters, real-time character counter (e.g., "23 / 2000")
- Preferred asset: if selected, must be in `available` or `returned` status. If status changed between load and submit, server returns `ASSET_NOT_AVAILABLE`.

### 13.5 Error Handling

| Error | Display |
|---|---|
| `NO_EMPLOYEE_PROFILE` | Banner: "You don't have an employee profile linked to your account. Please contact your administrator." Form disabled. |
| `ASSET_NOT_AVAILABLE` | Inline error on preferred asset field + clear the selection |

### 13.6 Loading States

- Form skeleton while employee data loads
- "Submitting..." spinner on button

### 13.7 Empty States

- If no available assets for preferred selection: "No assets currently available. You can submit the request without a preference, and Stores will select one for you."

---

## 14. Return List Page

### 14.1 Purpose

Track all asset return workflows — resignation returns, transfers,
equipment swaps. Primary view for P&C and Stores.

### 14.2 Table

| Column | Sortable | Content |
|---|---|---|
| ID | No | Short UUID, link to detail |
| Employee | Yes | Name + employee code |
| Reason | Yes | Badge: `resignation`, `termination`, `transfer`, `replacement`, `repair`, `lost`, `other` |
| Items | No | Count of return items (e.g., "2 devices") |
| Status | Yes | StatusBadge |
| Current Stage | Yes | Stage name |
| Created | Yes | Relative time |
| Actions | No | Kebab: View |

### 14.3 Filters

| Filter | Type |
|---|---|
| Search | Employee name, code |
| Status | Multi-select: `pending`, `in_progress`, `completed`, `cancelled` |
| Reason | Multi-select: all reason enum values |

### 14.4 User Actions

| Action | Role | Effect |
|---|---|---|
| Initiate return | SA, PC | Navigate to `/returns/new` |
| View detail | All | Navigate to return detail |

### 14.5 Empty States

- No returns: "No return records yet." + "Initiate Return" button (SA, PC)
- No filter results: standard "No matches" message

---

## 15. Return Detail Page

### 15.1 Purpose

Full view of a return with its items (individual devices being returned),
workflow state, condition notes, and uploaded photos.

### 15.2 Components

**Workflow Stepper:** Same pattern as allocation detail (§12), with return-specific stages:
1. Stores Receive → 2. IT Assessment → 3. Employee Signature → 4. P&C Signature → 5. Complete

**Return Info Panel:**
- Employee (link), Reason (badge), Damage Notes (if any), Created date

**Return Items Table:**

| Column | Content |
|---|---|
| Asset Tag | Monospace, link to asset detail |
| Model | Device model |
| Condition | StatusBadge: `good`, `fair`, `damaged`, `not_working` |
| Returned | Checkbox icon (✓ or ✕) |
| Missing Items | Text or "—" |
| Notes | Truncated, expand on click |

**Photos / Files Section:**
- Grid of uploaded evidence photos
- Click to open full-size in a lightbox modal
- "Upload Photo" button (SA, ST, PC) → file upload modal

**Action Panel:** Same pattern as allocation (§12.3), content per stage:

| Stage | Action Panel |
|---|---|
| `stores_receive` | "Confirm physical receipt of all items" + Confirm button |
| `it_assessment` | Link existing assessment or "Create New Assessment" per item |
| `employee_signature` | SignatureBox |
| `pc_signature` | SignatureBox |

**Transition History:** Same pattern as allocation (§12).

### 15.3 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Photo Upload** | "Upload Photo" button | Drag-and-drop zone + file picker. Accepts JPG, PNG, PDF. Max 10MB. Progress bar during upload. |
| **Photo Lightbox** | Click on a photo thumbnail | Full-size image with prev/next navigation. Download button. |

### 15.4 User Actions

| Action | Role | Stage | API Call |
|---|---|---|---|
| Confirm receipt | ST | `stores_receive` | `POST /returns/:id/transition` |
| Link assessment | IT | `it_assessment` | `POST /returns/:id/transition` with assessmentId |
| Sign | EM, PC | Respective stages | `POST /returns/:id/transition` with signature |
| Upload photo | SA, ST, PC | Any active stage | `POST /returns/:id/files` |

### 15.5 Empty States

- No files uploaded: "No photos or documents uploaded. Upload evidence of the device condition."
- Items list empty: This state shouldn't occur (items are required at creation)

---

## 16. Initiate Return Form

### 16.1 Purpose

P&C or Super Admin initiates the return process for an employee. Selects
which devices are being returned and documents their condition.

### 16.2 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| Employee | Searchable select | Yes | Must exist, must have assigned assets |
| Reason | Select | Yes | `resignation`, `termination`, `transfer`, `replacement`, `repair`, `lost`, `other` |
| Return Items | Dynamic list | Yes | At least 1 item |
| Damage Notes | Textarea | No | General notes about damage |

**Return Items (per row):**

| Field | Type | Required |
|---|---|---|
| Asset | Select (populated from employee's assigned assets) | Yes |
| Condition | Select: `good`, `fair`, `damaged`, `not_working` | Yes |
| Physically Returned | Checkbox | Yes |
| Missing Accessories | Text | No |
| Notes | Text | No |

### 16.3 Behavior

- When Employee is selected, the return items section loads with all their assigned assets pre-populated
- Each asset row has a checkbox to include/exclude it from this return
- Minimum 1 asset must be selected
- "Add item" isn't needed — all assets are pre-loaded; user deselects ones not being returned

### 16.4 Buttons

| Button | Action |
|---|---|
| **Submit Return** | `POST /returns`. On success: navigate to return detail. |
| **Cancel** | Back to returns list |

### 16.5 Error Handling

| Error | Display |
|---|---|
| `ASSET_NOT_ASSIGNED` | Banner: "One or more selected assets are not currently assigned to this employee." |
| `NO_ITEMS` | Inline: "Select at least one asset to return." |
| Employee has no assets | After selecting employee: "This employee has no assigned assets." Form items section disabled. |

---

## 17. Assessment List Page

### 17.1 Purpose

Track IT device assessments — performed during allocations, returns, and
standalone checks.

### 17.2 Table

| Column | Sortable | Content |
|---|---|---|
| Asset Tag | Yes | Monospace, link to asset |
| Model | Yes | Device model |
| Assessed By | Yes | IT rep name |
| Disposition | Yes | Badge: `pass` (green), `repair_recommended` (amber), `replacement_recommended` (red), `reject` (red) |
| Checklist | No | Summary: "20 pass / 0 fail / 3 N/A" |
| Linked Workflow | No | "Allocation ALQ-..." or "Return RET-..." (link) |
| Date | Yes | Assessment date |
| Actions | No | Kebab: View |

### 17.3 Filters

| Filter | Type |
|---|---|
| Search | Asset tag, model |
| Disposition | Multi-select |
| Assessed By | Searchable select (IT users) |
| Date Range | Date picker (from/to) |

### 17.4 Empty States

- No assessments: "No device assessments recorded. Assessments are created during allocation or return workflows." + "Create Assessment" button (SA, IT)

---

## 18. Assessment Detail Page

### 18.1 Purpose

View the complete device assessment including the full 23-component
checklist, technician notes, and disposition.

### 18.2 Components

**Header:**
- Asset tag + model name
- Assessed by (name + role)
- Assessment date
- Disposition badge (large)

**Checklist Grid:**

A visual grid showing all 23 components with their pass/fail/N/A status:

```
┌──────────────────┬──────────────────┬──────────────────┐
│ ✓ Screen         │ ✓ Keyboard       │ ✓ Battery (92%)  │
│ ✓ Charger        │ ─ Mouse (N/A)    │ ✓ Bag            │
│ ✓ Webcam         │ ✓ Microphone     │ ✓ Speakers       │
│ ✓ USB Ports (3)  │ ✓ HDMI           │ ✓ WiFi           │
│ ✓ Bluetooth      │ ✓ Storage (180GB)│ ✓ RAM (16GB)     │
│ ✓ OS (Win 11)    │ ✓ Antivirus (CS) │ ✓ Encryption     │
│ ✓ Asset Sticker  │ ✓ No Water Dmg   │ ✓ No Phys. Dmg   │
│ ✓ All Components │ ✓ Boots OK       │                   │
└──────────────────┴──────────────────┴──────────────────┘
```

Each cell: icon (✓ green, ✕ red, — grey), component name, notes (if any) shown below.
Failed items are highlighted with a red left border.

**Technician Notes:** Full text area (read-only).

**Linked Workflow:** Link to the allocation/return workflow instance.

### 18.3 Loading States

- Skeleton: header block + 23-cell grid placeholders + text area placeholder

### 18.4 Empty States

- If no notes: Notes section not shown (don't show an empty section)

---

## 19. New Assessment Form

### 19.1 Purpose

IT Representative creates a new device assessment with the 23-component
checklist.

### 19.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Assessments / New Assessment                   [Cancel] [Save]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ASSET                                                          │
│  ┌───────────────────────────────────┐                         │
│  │ Asset *                      ▼    │                         │
│  │ AST-0042 · ThinkPad T14 Gen 3    │                         │
│  └───────────────────────────────────┘                         │
│  ┌───────────────────────────────────┐                         │
│  │ Linked Workflow Instance     ▼    │  (optional)             │
│  └───────────────────────────────────┘                         │
│  ─────────────────────────────────────────────────              │
│  CHECKLIST                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Component          │ Status          │ Notes             │   │
│  │────────────────────────────────────────────────────────│   │
│  │ Screen              │ ◉ Pass ○ Fail ○ N/A │              │   │
│  │ Keyboard            │ ◉ Pass ○ Fail ○ N/A │              │   │
│  │ Battery             │ ◉ Pass ○ Fail ○ N/A │ 92% health   │   │
│  │ Charger             │ ◉ Pass ○ Fail ○ N/A │              │   │
│  │ Mouse               │ ○ Pass ○ Fail ◉ N/A │ No external  │   │
│  │ ...                 │                      │              │   │
│  │ Boots Successfully  │ ◉ Pass ○ Fail ○ N/A │              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────────              │
│  DISPOSITION *                                                  │
│  ◉ Pass   ○ Repair Recommended   ○ Replacement Rec.   ○ Reject│
│  ─────────────────────────────────────────────────              │
│  TECHNICIAN NOTES                                               │
│  ┌──────────────────────────────────────────────┐              │
│  │ (textarea)                                    │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
│                                      [Cancel] [Save Assessment]│
└─────────────────────────────────────────────────────────────────┘
```

### 19.3 Forms

**Checklist components (all 23):**

| Component | Category |
|---|---|
| Screen | Hardware |
| Keyboard | Hardware |
| Battery | Hardware |
| Charger | Accessories |
| Mouse | Accessories |
| Bag | Accessories |
| Webcam | Hardware |
| Microphone | Hardware |
| Speakers | Hardware |
| USB Ports | Hardware |
| HDMI | Hardware |
| WiFi | Connectivity |
| Bluetooth | Connectivity |
| Storage | Hardware |
| RAM | Hardware |
| OS | Software |
| Antivirus | Software |
| Encryption | Security |
| Asset Sticker | Physical |
| Water Damage | Physical |
| Physical Damage | Physical |
| Missing Components | Physical |
| Boots Successfully | System |

Each component has: radio group (Pass/Fail/N/A) + optional notes text input.

### 19.4 Validation

- Asset: required
- At least required components must be assessed: Screen, Keyboard, Battery, Boots Successfully
- If any component is `fail`, disposition cannot be `pass` — show warning: "Disposition is 'Pass' but there are failed checklist items. Please review."
- Duplicate components are prevented by the fixed list
- "Quick fill" button: "Mark all as Pass" (with confirmation) for fast entry when everything checks out

### 19.5 Buttons

| Button | Action |
|---|---|
| **Save Assessment** | `POST /assessments`. On success: navigate to assessment detail + toast "Assessment saved." |
| **Cancel** | Back to assessments list |
| **Mark All Pass** | Sets all components to Pass. Shows confirmation first. |

### 19.6 Error Handling

| Error | Display |
|---|---|
| `DISPOSITION_MISMATCH` | Banner above disposition: "Cannot set Pass when checklist items have failed." |
| `REQUIRED_COMPONENTS_MISSING` | Inline: highlights missing required components in red |

---

## 20. Repair List Page

### 20.1 Purpose

Track device repairs — internal and vendor-outsourced.

### 20.2 Table

| Column | Sortable | Content |
|---|---|---|
| Asset Tag | Yes | Monospace, link to asset |
| Model | Yes | Device model |
| Fault | No | Truncated description, tooltip for full |
| Technician | Yes | Assigned IT rep |
| Vendor | Yes | Repair vendor or "Internal" |
| Status | Yes | StatusBadge: `reported` (grey), `diagnosed` (blue), `in_progress` (blue), `awaiting_parts` (amber), `completed` (green), `cancelled` (grey) |
| Cost | Yes | Formatted currency or "—" |
| Est. Completion | Yes | Date, red if overdue |
| Created | Yes | Date |
| Actions | No | Kebab: View, Edit (SA, IT) |

### 20.3 Filters

| Filter | Type |
|---|---|
| Search | Asset tag, model |
| Repair Status | Multi-select |
| Assigned Technician | Searchable select |
| Vendor | Searchable select |

### 20.4 Empty States

- No repairs: "No repair records. Repairs are typically initiated after a device assessment flags an issue."

---

## 21. Repair Detail Page

### 21.1 Purpose

View and manage a single repair record — track progress, cost, vendor
involvement, and completion.

### 21.2 Components

**Header:**
- Asset tag + model, repair status badge
- Action buttons: "Edit" (SA, IT), "Mark Complete" (SA, IT)

**Detail Card (two columns):**

Left:
- Fault Description (full text)
- Reported By (name, link)
- Created date

Right:
- Assigned Technician (name, link)
- Vendor (name, link) or "Internal repair"
- Estimated Completion (date, red if overdue)
- Repair Status (StatusBadge)
- Cost (formatted currency) or "Not estimated"

**Timeline:**
- Status change history for this repair
- Each entry: date, user, from-status → to-status, notes

### 21.3 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Mark Complete** | "Mark Complete" button | Confirm completion. Fields: final cost (number), outcome notes (textarea). Submit changes status to `completed` and updates asset status. |

### 21.4 User Actions

| Action | Role | API Call |
|---|---|---|
| Edit repair | SA, IT | Navigate to edit form |
| Mark complete | SA, IT | `PATCH /repairs/:id` with `repairStatus: "completed"` |

---

## 22. Repair Create / Edit Form

### 22.1 Purpose

Create a new repair record or update an existing one.

### 22.2 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| Asset | Searchable select | Yes (create) | Must exist |
| Fault Description | Textarea | Yes | Min 10, max 2000 |
| Assigned Technician | Searchable select (IT users) | No | Must have IT role |
| Vendor | Searchable select | No | Must exist |
| Estimated Completion | Date picker | No | Must be in future |
| Repair Status | Select (edit only) | No | Valid enum value |
| Cost | Number input | No | Non-negative |
| Cost Currency | Select | No | Default NGN |

### 22.3 Buttons

| Button | Action |
|---|---|
| **Save** | `POST /repairs` (create) or `PATCH /repairs/:id` (edit) |
| **Cancel** | Navigate back |

---

## 23. Disposal List Page

### 23.1 Purpose

Track asset disposal requests and their approval status.

### 23.2 Table

| Column | Sortable | Content |
|---|---|---|
| Asset Tag | Yes | Monospace, link to asset |
| Model | Yes | Device model |
| Reason | No | Truncated text |
| Method | Yes | Badge: `recycled`, `donated`, `destroyed`, `sold`, `returned_to_vendor` |
| Status | Yes | StatusBadge: `pending` (amber), `approved` (green), `completed` (green), `rejected` (red) |
| Requested By | Yes | User name |
| Approved By | Yes | User name or "—" |
| Created | Yes | Date |
| Actions | No | Kebab: View, Approve (SA) |

### 23.3 Filters

| Filter | Type |
|---|---|
| Search | Asset tag, model |
| Status | Multi-select |
| Method | Multi-select |

### 23.4 Tabs (above table)

| Tab | Filter |
|---|---|
| All | None |
| Pending Approval | `status=pending` |
| Approved | `status=approved` |
| Rejected | `status=rejected` |

### 23.5 Empty States

- No disposals: "No disposal requests. Disposals are initiated when an asset reaches end-of-life."

---

## 24. Disposal Detail Page

### 24.1 Purpose

View a disposal request and, for Super Admin, approve or reject it with
a digital signature.

### 24.2 Components

**Header:**
- Asset tag + model, disposal status badge
- Action buttons: "Approve" / "Reject" (SA, only if status = `pending`)

**Detail Card:**
- Asset info (tag, model, brand, current status)
- Reason (full text)
- Proposed Method (badge)
- Evidence Notes
- Requested By (name, date)
- Approved By (name, date) — if approved
- Evidence Files (thumbnail grid)

**Approval Panel (SA only, status = pending):**

```
┌─────────────────────────────────────────┐
│ APPROVAL DECISION                       │
│                                         │
│ ◉ Approve   ○ Reject                   │
│                                         │
│ Reason / Notes:                         │
│ ┌─────────────────────────────────────┐ │
│ │ (textarea)                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ SIGNATURE                               │
│ Full Name: [_________________________]  │
│ ☑ I confirm this disposal decision      │
│                                         │
│ [Submit Decision]                       │
└─────────────────────────────────────────┘
```

### 24.3 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Upload Evidence** | "Upload Evidence" button (SA, ST) | Same as return photo upload (§15.3) |

### 24.4 Validation

| Field | Rule | Error |
|---|---|---|
| Decision | Required | "Select Approve or Reject" |
| Reason (reject) | Required if rejecting | "A reason is required when rejecting a disposal" |
| Signature name | Required | "Full name is required" |
| Signature consent | Must be checked | "You must confirm to submit" |

### 24.5 Error Handling

| Error | Display |
|---|---|
| `NOT_PENDING` | Toast: "This disposal has already been processed." Refresh page. |
| `REJECTION_REASON_REQUIRED` | Inline error on reason field |

---

## 25. Disposal Request Form

### 25.1 Purpose

Stores Officer or Super Admin submits a disposal request for an asset.

### 25.2 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| Asset | Searchable select | Yes | Must not be `allocated`/`in_use`/`disposed` |
| Reason | Textarea | Yes | Min 10, max 2000 |
| Proposed Method | Select | No | `recycled`, `donated`, `destroyed`, `sold`, `returned_to_vendor` |
| Evidence Notes | Textarea | No | — |
| Evidence Files | File upload | No | JPG, PNG, PDF. Max 10MB each. |

### 25.3 Buttons

| Button | Action |
|---|---|
| **Submit Request** | `POST /disposals`. On success: navigate to disposal detail + toast "Disposal request submitted for approval." |
| **Cancel** | Navigate back |

### 25.4 Error Handling

| Error | Display |
|---|---|
| `ASSET_CURRENTLY_ASSIGNED` | Inline: "This asset is currently assigned. It must be returned before disposal." |
| `ASSET_ALREADY_DISPOSED` | Inline: "This asset has already been disposed." |

---

## 26. Vendor List Page

### 26.1 Purpose

Manage vendor/supplier records for procurement and repairs.

### 26.2 Table

| Column | Sortable | Content |
|---|---|---|
| Name | Yes | Vendor name, link to detail |
| Email | Yes | Contact email |
| Phone | Yes | Contact phone |
| Status | Yes | StatusBadge: `active` (green), `inactive` (grey) |
| Assets Supplied | No | Count of assets from this vendor |
| Actions | No | Kebab: View, Edit (SA, ST) |

### 26.3 Filters

| Filter | Type |
|---|---|
| Search | Name, email |
| Status | Toggle: Active / Inactive / All |

### 26.4 Empty States

- No vendors: "No vendors registered. Add your first vendor to start tracking procurement sources." + "+ Add Vendor" button

---

## 27. Vendor Detail Page

### 27.1 Purpose

View vendor information and related assets/procurement records.

### 27.2 Components

**Header Card:**
- Vendor name, status badge
- Contact email, phone, address
- Tax ID
- Action button: "Edit" (SA, ST)

**Tabs:**

| Tab | Content |
|---|---|
| **Details** | Full contact info, address, tax ID |
| **Assets Supplied** | Table of assets where this vendor is the vendor. Columns: Asset Tag, Model, Purchase Date, Amount |
| **Repair History** | Table of repairs sent to this vendor. Columns: Asset, Fault, Status, Cost |

### 27.3 Empty States

- No assets: "No assets procured from this vendor."
- No repairs: "No repairs performed by this vendor."

---

## 28. Vendor Create / Edit Form

### 28.1 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| Name | Text | Yes | Max 255 |
| Contact Email | Email | No | Valid email, max 255 |
| Contact Phone | Text | No | Max 50 |
| Address | Textarea | No | Max 500 |
| Tax ID | Text | No | Max 50 |

### 28.2 Buttons

| Button | Action |
|---|---|
| **Save** | `POST /vendors` or `PATCH /vendors/:id` |
| **Cancel** | Navigate back |

---

## 29. User Management Page

### 29.1 Purpose

Super Admin manages system user accounts: create, edit roles, activate/
deactivate.

### 29.2 Table

| Column | Sortable | Content |
|---|---|---|
| Name | Yes | `lastName, firstName` |
| Email | Yes | Email address |
| Role | Yes | Badge with role color: SA (purple), ST (blue), IT (teal), PC (green), EM (grey) |
| Status | Yes | `active` (green dot), `inactive` (grey dot) |
| Last Login | Yes | Relative time or "Never" |
| Linked Employee | Yes | Employee code (link) or "—" |
| Actions | No | Kebab: Edit, Change Role, Deactivate/Activate |

### 29.3 Filters

| Filter | Type |
|---|---|
| Search | Name, email |
| Role | Select dropdown |
| Status | Toggle: Active / Inactive / All |

### 29.4 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Change Role** | Kebab → Change Role | Current role shown. New role dropdown. Warning if changing from SA: "Removing Super Admin role cannot be undone by the user themselves." Confirm / Cancel. |
| **Deactivate User** | Kebab → Deactivate | "Deactivate this user? They will be logged out and unable to sign in." Confirm / Cancel. |
| **Activate User** | Kebab → Activate | "Reactivate this user? They will be able to sign in again." Confirm / Cancel. |

### 29.5 User Actions

| Action | API Call |
|---|---|
| Create user | Navigate to `/admin/users/new` |
| Edit user | Navigate to `/admin/users/:id/edit` |
| Change role | `PATCH /users/:id/role` |
| Deactivate | `PATCH /users/:id` with `isActive: false` |
| Activate | `PATCH /users/:id` with `isActive: true` |

### 29.6 Error Handling

| Error | Display |
|---|---|
| `CANNOT_DEMOTE_LAST_ADMIN` | Toast: "Cannot remove Super Admin role from the last administrator. Assign another Super Admin first." |

### 29.7 Empty States

- No users: This state shouldn't occur (at least the current SA exists)
- No filter results: "No users match your criteria."

---

## 30. User Create / Edit Form

### 30.1 Forms

| Field | Type | Required | Validation |
|---|---|---|---|
| First Name | Text | Yes | Max 100 |
| Last Name | Text | Yes | Max 100 |
| Email | Email | Yes | Valid email, max 255, unique |
| Role | Select | Yes | From roles list |
| Password | Password (create only) | Yes (create) | Min 8, max 128 |
| Confirm Password | Password (create only) | Yes (create) | Must match password |

### 30.2 Buttons

| Button | Action |
|---|---|
| **Save** | `POST /users` or `PATCH /users/:id` |
| **Cancel** | Navigate back |

### 30.3 Error Handling

| Error | Display |
|---|---|
| `DUPLICATE_EMAIL` | Inline on email field: "This email is already registered" |
| `ROLE_NOT_FOUND` | Should not occur with dropdown; fallback toast |

---

## 31. Master Data Management Page

### 31.1 Purpose

Super Admin manages reference data: Departments, Offices, Device Types,
Brands. Single page with tab navigation between resource types.

### 31.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin / Master Data                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Departments] [Offices] [Device Types] [Brands]                │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ [🔍 Search...]    [+ Add New]    │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │ Name            │ Status   │ Used By  │ Actions    │        │
│  │─────────────────────────────────────────────────── │        │
│  │ Engineering      │ 🟢 Active │ 85 assets │ ✏️ ⚙     │        │
│  │ Finance          │ 🟢 Active │ 42 assets │ ✏️ ⚙     │        │
│  │ Marketing        │ 🟢 Active │ 38 assets │ ✏️ ⚙     │        │
│  │ Legacy Dept.     │ ⚫ Inactive│ 0 assets │ ✏️ ⚙     │        │
│  └────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 31.3 Tabs

| Tab | Table Columns |
|---|---|
| **Departments** | Name, Parent Department, Status, Employees Count, Assets Count, Actions |
| **Offices** | Name, City, Address, Status, Employees Count, Actions |
| **Device Types** | Name, Status, Assets Count, Actions |
| **Brands** | Name, Status, Assets Count, Actions |

### 31.4 Modals

| Modal | Trigger | Content |
|---|---|---|
| **Add / Edit** | "+ Add New" or Edit action | Inline form within modal. Fields vary by resource type: Name (required), + Parent Department (departments only), + Address/City (offices only), Is Active toggle. |
| **Deactivate** | Actions → Deactivate | "Deactivate [name]? It will no longer appear in dropdown menus but existing references will be preserved." Confirm / Cancel. |

### 31.5 Validation

| Field | Rule | Error |
|---|---|---|
| Name | Required, max 100, unique within type | "This name already exists" |
| Parent Department | Must exist | "Selected department not found" |

### 31.6 User Actions

| Action | API Call |
|---|---|
| Add new item | `POST /master-data/:resource` |
| Edit item | `PATCH /master-data/:resource/:id` |
| Deactivate | `PATCH /master-data/:resource/:id` with `isActive: false` |
| Activate | `PATCH /master-data/:resource/:id` with `isActive: true` |

### 31.7 Empty States

Per tab: "No [resource type] defined yet. Add your first one to get started." + "+ Add" button.

---

## 32. Workflow Configuration Page

### 32.1 Purpose

Super Admin views and configures workflow definitions — modify SLA hours,
signature requirements, and required roles per stage. This is the
"configurable state machine" admin interface.

### 32.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin / Workflow Configuration                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │ WORKFLOW DEFINITIONS                                │        │
│  │                                                     │        │
│  │ ┌──────────────────────────────────────────────────┐│        │
│  │ │ 📋 Asset Allocation           v1     🟢 Active  ││        │
│  │ │ 7 stages · 12 active instances                   ││        │
│  │ │ [Configure →]                                    ││        │
│  │ └──────────────────────────────────────────────────┘│        │
│  │ ┌──────────────────────────────────────────────────┐│        │
│  │ │ 📋 Asset Return                v1     🟢 Active  ││        │
│  │ │ 5 stages · 3 active instances                    ││        │
│  │ │ [Configure →]                                    ││        │
│  │ └──────────────────────────────────────────────────┘│        │
│  │ ┌──────────────────────────────────────────────────┐│        │
│  │ │ 📋 Asset Disposal              v1     🟢 Active  ││        │
│  │ │ 3 stages · 1 active instance                     ││        │
│  │ │ [Configure →]                                    ││        │
│  │ └──────────────────────────────────────────────────┘│        │
│  └────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 32.3 Workflow Detail / Configuration View

When "Configure" is clicked:

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin / Workflows / Asset Allocation         [Save Changes]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Asset Allocation Workflow                    v1  🟢 Active    │
│  "Multi-stage workflow for allocating assets to employees"     │
│                                                                 │
│  STAGES                                                         │
│  ┌────┬──────────────┬────────────┬──────┬──────┬────────┐    │
│  │ #  │ Stage Name    │ Req. Role  │ SLA  │ Sig? │ Type   │    │
│  ├────┼──────────────┼────────────┼──────┼──────┼────────┤    │
│  │ 1  │ P&C Review    │ P&C    ▼   │ 24h  │ ☐   │ Seq.   │    │
│  │ 2  │ Stores Select │ Stores ▼   │ 48h  │ ☐   │ Seq.   │    │
│  │ 3  │ IT Assessment │ IT     ▼   │ 24h  │ ☐   │ Seq.   │    │
│  │ 4  │ Emp. Sign     │ Employee ▼ │ 72h  │ ☑   │ Seq.   │    │
│  │ 5  │ P&C Sign      │ P&C    ▼   │ 48h  │ ☑   │ Seq.   │    │
│  │ 6  │ IT Sign       │ IT     ▼   │ 48h  │ ☑   │ Seq.   │    │
│  │ 7  │ Complete      │ —          │ —    │ ☐   │ Term.  │    │
│  └────┴──────────────┴────────────┴──────┴──────┴────────┘    │
│                                                                 │
│  Stage names and order cannot be changed here. To restructure  │
│  a workflow, create a new version.                              │
│                                                                 │
│  ⚠ 12 active workflow instances are using this definition.     │
│  Changes to SLA and signature requirements take effect on       │
│  new transitions only.                                          │
│                                                                 │
│                                              [Save Changes]    │
└─────────────────────────────────────────────────────────────────┘
```

### 32.4 Components

**Definitions List:**
- Card per workflow definition
- Each card: icon, name, version, active status badge, stage count, active instance count, "Configure" button

**Configuration Table:**
- Editable inline table
- Stage Name: read-only
- Required Role: dropdown (editable)
- SLA Hours: number input (editable)
- Requires Signature: checkbox (editable)
- Stage Type: read-only
- Stage order: read-only (shown as row number)

**Warning banner:** Shown when there are active instances. Explains impact scope.

### 32.5 Validation

| Field | Rule | Error |
|---|---|---|
| SLA Hours | Positive integer | "SLA must be a positive number" |
| Required Role | Must exist | Dropdown prevents invalid selection |

### 32.6 Error Handling

| Error | Display |
|---|---|
| `HAS_ACTIVE_INSTANCES` (deactivation) | Toast: "Cannot deactivate — X active instances are using this workflow." |
| `STAGE_NOT_FOUND` | Toast: "Configuration error. Please refresh and try again." |

### 32.7 User Actions

| Action | API Call |
|---|---|
| Update stage SLA | `PATCH /workflow-definitions/:id` |
| Toggle signature | `PATCH /workflow-definitions/:id` |
| Change required role | `PATCH /workflow-definitions/:id` |
| Deactivate workflow | `PATCH /workflow-definitions/:id` with `isActive: false` |

---

## 33. Reports Hub

### 33.1 Purpose

Central page listing all available report types. Entry point to run any
report.

### 33.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Reports                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ REPORT CATEGORIES                                      │    │
│  │                                                        │    │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │    │
│  │ │ 📊 Inventory │ │ 📋 Allocation│ │ ↩ Return    │      │    │
│  │ │ Full asset   │ │ Allocation   │ │ Return      │      │    │
│  │ │ inventory    │ │ history      │ │ history     │      │    │
│  │ │ [Generate →] │ │ [Generate →] │ │ [Generate →]│      │    │
│  │ └─────────────┘ └─────────────┘ └─────────────┘      │    │
│  │                                                        │    │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │    │
│  │ │ 🔧 Repair    │ │ 🗑 Disposal  │ │ 🏢 Department│      │    │
│  │ │ Repair       │ │ Disposal     │ │ Assets by   │      │    │
│  │ │ history      │ │ history      │ │ department  │      │    │
│  │ │ [Generate →] │ │ [Generate →] │ │ [Generate →]│      │    │
│  │ └─────────────┘ └─────────────┘ └─────────────┘      │    │
│  │                                                        │    │
│  │ ┌─────────────┐ ┌─────────────┐                       │    │
│  │ │ 👤 Employee  │ │ ⚠ Compliance│                       │    │
│  │ │ Employee     │ │ SLA breach  │                       │    │
│  │ │ asset history│ │ report      │                       │    │
│  │ │ [Generate →] │ │ [Generate →]│                       │    │
│  │ └─────────────┘ └─────────────┘                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 33.3 Components

- Grid of report cards (3 per row on desktop, 2 on tablet, 1 on mobile)
- Each card: icon, report name, description, "Generate" button
- Cards are role-filtered — users only see reports they have permission to run

**Report type visibility:**

| Report | Roles |
|---|---|
| Inventory | SA, ST |
| Allocation | SA, PC, ST |
| Return | SA, PC, ST |
| Repair | SA, ST, IT |
| Disposal | SA, ST |
| Department | SA, PC |
| Employee History | SA, PC |
| Compliance | SA, PC |

### 33.4 User Actions

| Action | Effect |
|---|---|
| Click "Generate" | Navigate to `/reports/:type` (report viewer) |

---

## 34. Report Viewer Page

### 34.1 Purpose

Generate and view a specific report with configurable parameters. Preview
data on-screen and export to PDF, Excel, or CSV.

### 34.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Reports / Inventory Report                    [Export ▼]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PARAMETERS                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Date From  📅       Date To  📅       Department  ▼      │   │
│  │ Office  ▼           Status  ▼         [Generate Report]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SUMMARY                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ 350      │ │ ₦52.5M   │ │ 18       │                       │
│  │ Total    │ │ Total    │ │ Departments│                      │
│  │ Assets   │ │ Value    │ │           │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
│                                                                 │
│  REPORT DATA                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Asset Tag │ Serial  │ Type   │ Brand │ Model  │ Status   │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ AST-0001  │ SN123   │ Laptop │ Dell  │ Lat.   │ In Use   │   │
│  │ AST-0002  │ SN124   │ Phone  │ Apple │ iP 15  │ Available│   │
│  │ ...       │         │        │       │        │          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ◄ 1 2 3 4 ►                           100 per page ▼         │
│                                                                 │
│  Generated: Jul 10, 2026 10:00 AM                              │
└─────────────────────────────────────────────────────────────────┘
```

### 34.3 Components

**Parameter Bar:**
- Date From / Date To: date pickers
- Department: dropdown (optional filter)
- Office: dropdown (optional filter)
- Additional filters vary by report type
- "Generate Report" button to execute with current parameters

**Summary Cards:**
- Report-specific summary values displayed as stat cards
- Inventory: Total Assets, Total Value, Department Count
- Allocation: Total Requests, Completed, Average Completion Time
- Compliance: Total Breaches, Resolved, Escalated

**Data Table:**
- Columns vary by report type
- Paginated with 100 rows per page default
- All columns sortable
- Matches the `rows` array from the API response

**Export Dropdown:**

| Option | Action |
|---|---|
| Export as PDF | `GET /reports/:type/export?format=pdf` → download |
| Export as Excel | `GET /reports/:type/export?format=xlsx` → download |
| Export as CSV | `GET /reports/:type/export?format=csv` → download |

### 34.4 Loading States

- "Generating report..." spinner overlay on the data section
- Export: button shows spinner, "Preparing download..."

### 34.5 Empty States

- No data for parameters: "No data found for the selected criteria. Try adjusting the date range or filters."
- Before generating: "Configure the parameters above and click 'Generate Report' to view data."

---

## 35. Notification Center

### 35.1 Purpose

Full-page view of all notifications. Accessible from the bell icon
dropdown's "View all" link.

### 35.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Notifications                              [Mark All as Read] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [All (15)]  [Unread (3)]                                      │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔵 Allocation request requires your review    3h ago     │   │
│  │    Jane Smith submitted a new device request.            │   │
│  │    Stage: P&C Review                                     │   │
│  │                                      [View Request →]    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 🔵 SLA breach alert                           1d ago     │   │
│  │    Allocation ALQ-8f3a has exceeded the 24-hour SLA      │   │
│  │    at the P&C Review stage.                              │   │
│  │                                      [View Details →]    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │    Return completed                           2d ago     │   │
│  │    Return RET-4a2c for EMP-0024 has been completed.      │   │
│  │    3 devices returned.                                   │   │
│  │                                      [View Return →]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ◄ 1 2 ►                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 35.3 Components

**Tab Bar:**
- All (total count) | Unread (unread count)

**Notification List:**
- Each item: unread indicator (blue dot), subject (bold if unread), body text, relative timestamp, action link
- Click anywhere on the row: marks as read + navigates to the reference resource
- Hover: subtle highlight

**Bulk Actions:**
- "Mark All as Read" button (top-right)

### 35.4 User Actions

| Action | API Call |
|---|---|
| Click notification | `PATCH /notifications/:id/read` + navigate to reference |
| Mark all as read | `POST /notifications/read-all` |
| Filter unread | Client-side filter or `GET /notifications?isRead=false` |

### 35.5 Loading States

- Notification list skeleton (4-5 placeholder rows)
- "Mark All as Read" shows spinner during API call

### 35.6 Empty States

| Condition | Message |
|---|---|
| No notifications at all | "No notifications yet. You'll receive updates when workflow actions require your attention." |
| Unread tab empty | "All caught up! No unread notifications." |

---

## 36. Notification Preferences Page

### 36.1 Purpose

Users configure how they receive notifications for different event types.

### 36.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings / Notification Preferences                   [Save]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Configure how you receive notifications for each category.    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Category          │ Immediate │ Daily Digest │ In-App Only│  │
│  │──────────────────────────────────────────────────────────│   │
│  │ Allocations        │ ◉         │ ○            │ ○          │  │
│  │ Returns            │ ◉         │ ○            │ ○          │  │
│  │ Assessments        │ ○         │ ◉            │ ○          │  │
│  │ Compliance / SLA   │ ◉         │ ○            │ ○          │  │
│  │ System Updates     │ ○         │ ○            │ ◉          │  │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  • Immediate: Email sent as soon as the event occurs.          │
│  • Daily Digest: Events grouped into a daily email summary.     │
│  • In-App Only: Only visible in the notification center.       │
│                                                                 │
│                                                       [Save]   │
└─────────────────────────────────────────────────────────────────┘
```

### 36.3 Components

- Table with radio button groups per category
- Help text explaining each delivery method
- Save button (top-right and bottom-right)

### 36.4 User Actions

| Action | API Call |
|---|---|
| Change preference | Client-side state update |
| Save | `PATCH /notifications/preferences` |

### 36.5 Validation

- At least one method must be selected per category (radio buttons prevent none)
- Save button disabled until changes are made

---

## 37. Audit Log Viewer

### 37.1 Purpose

Super Admin reviews the immutable audit trail. Read-only — no create,
edit, or delete actions.

### 37.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin / Audit Logs                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ User ▼     Action ▼     Resource Type ▼                  │   │
│  │ Date From 📅            Date To 📅         [Apply]       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ #    │ Timestamp            │ User         │ Action      │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 1042 │ Jul 10, 08:30:00 AM │ admin@co.com │ WF_TRANS.   │   │
│  │      │ Resource: workflow_instance / uuid                │   │
│  │      │ ┌ Old: { stage: "pc_review" }                     │   │
│  │      │ └ New: { stage: "stores_select" }                 │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 1041 │ Jul 10, 08:15:00 AM │ jane@co.com  │ ASSET_VIEW  │   │
│  │      │ Resource: asset / uuid                            │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ ...                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ◄ 1 2 3 ... 100 ►                          50 per page ▼     │
└─────────────────────────────────────────────────────────────────┘
```

### 37.3 Table

| Column | Content |
|---|---|
| # | Sequential audit log ID (BIGINT) |
| Timestamp | Absolute datetime with timezone |
| User | Email + name |
| Action | Action code badge (e.g., `WORKFLOW_TRANSITION`, `ASSET_CREATE`, `USER_LOGIN`) |
| Resource | Resource type + resource ID |
| IP Address | Client IP |
| Changes | Expandable row showing `oldValue` → `newValue` JSON diff |

**Row expansion:** Click a row to expand and show the full before/after JSON diff. Diff view highlights added (green), removed (red), and changed (amber) fields.

### 37.4 Filters

| Filter | Type |
|---|---|
| User | Searchable select (all users) |
| Action | Multi-select: all action types |
| Resource Type | Select: `asset`, `workflow_instance`, `allocation_request`, `return_record`, `user`, etc. |
| Resource ID | Text input (UUID) |
| Date From | DateTime picker |
| Date To | DateTime picker |

### 37.5 User Actions

- This is a read-only page. No create, edit, or delete actions.
- Export: "Export" button to download filtered logs as CSV

### 37.6 Loading States

- Table skeleton with 10 rows
- Filter dropdowns show spinners while loading user list

### 37.7 Empty States

- No matching logs: "No audit log entries match your filters. Try adjusting the criteria."
- Fresh system: "No audit activity recorded yet. Activity will appear here as users interact with the system."

---

## 38. Compliance Dashboard

### 38.1 Purpose

Monitor SLA breaches and escalations. Alerts P&C and Super Admin to
workflow bottlenecks and overdue items.

### 38.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Compliance                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 5        │ │ 2        │ │ 3        │ │ 2        │          │
│  │ Active   │ │ Escalated│ │ Resolved │ │ Avg Hrs  │          │
│  │ Breaches │ │          │ │ (30d)    │ │ Overdue  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  [Active Breaches] [Escalations] [History]                     │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  ACTIVE BREACHES                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Workflow     │ Stage        │ SLA  │ Actual │ Overdue   │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 🔴 Allocation │ P&C Review   │ 24h  │ 72h    │ 48h      │   │
│  │ ALQ-8f3a     │              │      │        │ ESCALATED │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 🟠 Return     │ IT Assessment│ 24h  │ 30h    │ 6h       │   │
│  │ RET-4a2c     │              │      │        │           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 38.3 Components

**Stat Cards:**
- Active Breaches (danger color if > 0)
- Escalated (danger color if > 0)
- Resolved (30 days, success color)
- Average Hours Overdue

**Tabs:**

| Tab | Content |
|---|---|
| **Active Breaches** | Table of unresolved SLA breaches |
| **Escalations** | Table of escalated breaches with escalation target info |
| **History** | All breaches (resolved and active) with date range filter |

### 38.4 Active Breaches Table

| Column | Content |
|---|---|
| Severity | Color indicator: red (>2× SLA), amber (>1× SLA) |
| Workflow Type | Allocation, Return, etc. |
| Reference | Link to the workflow detail page |
| Stage | The stage that is overdue |
| SLA | Configured SLA hours |
| Actual | Hours spent at this stage |
| Overdue By | Hours past SLA |
| Escalated | Badge if escalated, with escalation target name |
| Breached At | Timestamp |

### 38.5 Filters

| Filter | Type |
|---|---|
| Workflow Type | Select: allocation, return, repair, disposal |
| Is Escalated | Toggle |
| Date Range | Date pickers (from/to) |

### 38.6 User Actions

| Action | Effect |
|---|---|
| Click breach row | Navigate to the related workflow detail page |
| Click escalation | Navigate to the breach detail |

### 38.7 Empty States

- No breaches: "No SLA breaches detected. All workflows are within their SLA targets." (with success icon)
- No escalations: "No active escalations."

---

## 39. Global Search Results Page

### 39.1 Purpose

Display results from the global search (triggered by `Ctrl+K` or the
search bar). Shows results across assets and employees.

### 39.2 Layout

Two interaction modes:

**Mode 1 — Command Palette (overlay):**

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search assets, employees...                           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ASSETS                                                    │   │
│  │  🖥 AST-0042 · ThinkPad T14 Gen 3 · In Use              │   │
│  │  🖥 AST-0043 · ThinkPad T14 Gen 3 · Available           │   │
│  │                                                           │   │
│  │ EMPLOYEES                                                 │   │
│  │  👤 Jane Smith · EMP-0042 · Engineering                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ↑↓ Navigate   Enter Select   Esc Close                        │
└─────────────────────────────────────────────────────────────────┘
```

- Centered modal overlay (like Spotlight / Jira quick search)
- Type-ahead: results appear after 2+ characters, debounced 200ms
- Grouped by type (Assets, Employees)
- Max 5 results per type
- Arrow keys to navigate, Enter to select, Esc to close
- Click a result to navigate to its detail page

**Mode 2 — Full Results Page (if user presses Enter on search input or clicks "See all results"):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Search Results for "thinkpad"                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [All (12)]  [Assets (10)]  [Employees (2)]                    │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  ASSETS (10 results)                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AST-0042 · Lenovo ThinkPad T14 Gen 3 · In Use           │   │
│  │ S/N: PF3KL789 · Matched on: model                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ AST-0043 · Lenovo ThinkPad T14 Gen 3 · Available        │   │
│  │ S/N: PF3KL790 · Matched on: model                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ... more results                                              │
│                                                                 │
│  EMPLOYEES (2 results)                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Jane Smith · EMP-0042 · Engineering                      │   │
│  │ Matched on: lastName                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 39.3 Components

- Segmented tabs: All, Assets, Employees
- Each result card: primary info, status badge, matched field indicator
- Click navigates to the detail page

### 39.4 Loading States

- Command palette: "Searching..." text below input with spinner
- Full page: Skeleton cards (3-4 placeholder rows per section)

### 39.5 Empty States

- No results: "No results found for '[query]'. Try a different search term."
- Query too short: "Type at least 2 characters to search."

---

## 40. User Profile Page

### 40.1 Purpose

Current user's own profile. View personal information, change password.

### 40.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  My Profile                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  👤 Jane Smith                                           │   │
│  │  jane@company.com                                        │   │
│  │  Role: People & Culture                                  │   │
│  │  Last login: Jul 10, 2026 08:00 AM                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Profile] [Security] [Notifications]                           │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  PROFILE TAB:                                                   │
│  ┌───────────────────────────┬───────────────────────────┐      │
│  │ ACCOUNT                   │ LINKED EMPLOYEE           │      │
│  │                           │                           │      │
│  │ Email    jane@company.com │ Code     EMP-0042         │      │
│  │ Name     Jane Smith       │ Dept.    Engineering      │      │
│  │ Role     P&C              │ Office   Lagos HQ         │      │
│  │                           │ Manager  Bob Jones        │      │
│  │                           │ Status   Active           │      │
│  └───────────────────────────┴───────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 40.3 Tabs

| Tab | Content |
|---|---|
| **Profile** | Read-only view of account + linked employee info |
| **Security** | Change Password form |
| **Notifications** | Shortcut to notification preferences (same as §36) |

**Security Tab — Change Password Form:**

| Field | Type | Required | Validation |
|---|---|---|---|
| Current Password | Password | Yes | Required |
| New Password | Password | Yes | Min 8, max 128, must differ from current |
| Confirm Password | Password | Yes | Must match new password |

### 40.4 Buttons

| Button | Action |
|---|---|
| **Change Password** | `POST /auth/change-password` |

### 40.5 Validation

- New password strength indicator (weak/fair/strong bar)
- Confirm password: real-time match check
- Server error `INVALID_CREDENTIALS` → "Current password is incorrect"

### 40.6 Error Handling

| Error | Display |
|---|---|
| `INVALID_CREDENTIALS` | Inline error on current password field |
| `VALIDATION_ERROR` (same password) | Inline: "New password must be different from your current password" |
| Success | Toast: "Password changed successfully. You'll need to use the new password next time you log in." |

---

## Appendix A: Cross-Cutting Interaction Patterns

### A.1 Optimistic Locking Conflict

When the server returns `409 VERSION_CONFLICT`:

1. Show a modal: "This record was modified by another user while you were editing."
2. Options:
   - "Reload" — Refreshes the page with latest data (loses user's changes)
   - "Copy My Changes" — Copies the user's form data to clipboard, then reloads

This prevents silent data loss while respecting concurrent users.

### A.2 Session Expiry

When a `401` is returned on any API call (token expired, refresh failed):

1. Show a full-screen modal overlay: "Your session has expired."
2. Sub-text: "Please sign in again to continue."
3. Button: "Sign In" → redirect to login page
4. The login page preserves the intended URL and redirects back after successful login

### A.3 Toast Notification System

| Type | Color | Duration | Icon |
|---|---|---|---|
| Success | Green | 5 seconds | Checkmark |
| Error | Red | 10 seconds (or persistent for critical) | X circle |
| Warning | Amber | 8 seconds | Alert triangle |
| Info | Blue | 5 seconds | Info circle |

Stack behavior: max 3 visible. New toasts push older ones down. Manual dismiss via X button.

### A.4 Confirm Modal Pattern

All destructive or irreversible actions use a confirm modal:

```
┌─────────────────────────────────────┐
│  ⚠ Cancel this request?             │
│                                     │
│  The reserved asset will be         │
│  released back to inventory.        │
│  This cannot be undone.             │
│                                     │
│  Reason: (required)                 │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│           [Back]  [Confirm Cancel]  │
└─────────────────────────────────────┘
```

Destructive confirm button is red. Non-destructive is accent color. Cancel/Back is always a text button (no background).

### A.5 Bulk Action Pattern (future)

Tables with checkbox selection support bulk actions via a floating action bar that appears above the table when items are selected:

```
┌──────────────────────────────────────────────────────┐
│ 3 items selected     [Export Selected]  [Clear]      │
└──────────────────────────────────────────────────────┘
```

### A.6 Responsive Table → Card Transformation

On screens `<768px`, data tables transform to card lists:

```
┌─────────────────────────────┐
│ AST-0042                    │
│ ThinkPad T14 Gen 3          │
│ Lenovo · Laptop             │
│ Status: 🟢 In Use           │
│ Holder: Jane Smith          │
│ ──────────────────────────  │
│ [View] [Edit] [More ⋯]     │
└─────────────────────────────┘
```

Key fields shown inline, secondary fields accessible via "More" expand.

### A.7 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `⌘K` | Open global search |
| `Esc` | Close modal, clear search, deselect |
| `Ctrl+Enter` | Submit current form |
| `g d` | Go to Dashboard |
| `g a` | Go to Assets |
| `g e` | Go to Employees |
| `?` | Show keyboard shortcuts help modal |

---

## Appendix B: Page Inventory by Role

Summary of which pages each role can access:

| Page | SA | ST | IT | PC | EM |
|---|---|---|---|---|---|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Asset List | ✓ | ✓ | ✓ | ✓ | Own |
| Asset Detail | ✓ | ✓ | ✓ | ✓ | Own |
| Asset Create/Edit | ✓ | ✓ | — | — | — |
| Employee List | ✓ | — | — | ✓ | — |
| Employee Detail | ✓ | — | — | ✓ | — |
| Employee Create/Edit | ✓ | — | — | ✓ | — |
| Allocation List | ✓ | ✓ | ✓ | ✓ | Own |
| Allocation Detail | ✓ | ✓ | ✓ | ✓ | Own |
| New Allocation | ✓ | — | — | — | ✓ |
| Return List | ✓ | ✓ | ✓ | ✓ | Own |
| Return Detail | ✓ | ✓ | ✓ | ✓ | Own |
| Initiate Return | ✓ | — | — | ✓ | — |
| Assessment List | ✓ | ✓ | ✓ | — | — |
| Assessment Detail | ✓ | ✓ | ✓ | — | — |
| New Assessment | ✓ | — | ✓ | — | — |
| Repair List | ✓ | ✓ | ✓ | — | — |
| Repair Detail | ✓ | ✓ | ✓ | — | — |
| Repair Create/Edit | ✓ | ✓ | ✓ | — | — |
| Disposal List | ✓ | ✓ | — | — | — |
| Disposal Detail | ✓ | ✓ | — | — | — |
| Disposal Request | ✓ | ✓ | — | — | — |
| Vendor List | ✓ | ✓ | ✓ | — | — |
| Vendor Detail | ✓ | ✓ | ✓ | — | — |
| Vendor Create/Edit | ✓ | ✓ | — | — | — |
| User Management | ✓ | — | — | — | — |
| Master Data | ✓ | — | — | — | — |
| Workflow Config | ✓ | — | — | — | — |
| Reports Hub | ✓ | ✓ | ✓ | ✓ | — |
| Report Viewer | ✓ | ✓ | ✓ | ✓ | — |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notification Prefs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Audit Logs | ✓ | — | — | — | — |
| Compliance | ✓ | — | — | ✓ | — |
| Search Results | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Profile | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Appendix C: Page Count Summary

| Category | Pages | Sections |
|---|---|---|
| Authentication | 1 | Login |
| Dashboard | 1 | Dashboard |
| Asset Management | 3 | List, Detail, Create/Edit |
| Employee Management | 3 | List, Detail, Create/Edit |
| Allocations | 3 | List, Detail, New Request |
| Returns | 3 | List, Detail, Initiate |
| Assessments | 3 | List, Detail, New |
| Repairs | 3 | List, Detail, Create/Edit |
| Disposals | 3 | List, Detail, Request |
| Vendors | 3 | List, Detail, Create/Edit |
| Administration | 4 | Users, User Form, Master Data, Workflow Config |
| Reports | 2 | Hub, Viewer |
| Notifications | 2 | Center, Preferences |
| Audit & Compliance | 2 | Audit Logs, Compliance |
| Search | 1 | Search Results (+ Command Palette) |
| Profile | 1 | User Profile |
| **Total** | **38** | |
