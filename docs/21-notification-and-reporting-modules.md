# Notification System and Reporting & Analytics Modules

## 1. Notification System

### 1.1 Data model

Table `notifications`

| Column | Purpose |
| --- | --- |
| `id` uuid | PK |
| `recipient_user_id` uuid → `users` | Who receives the notification |
| `channel` varchar(16) | `IN_APP` or `EMAIL` (extensible) |
| `event_type` varchar(32) | One of 10 event types |
| `subject` varchar(255) | Notification headline |
| `message` text | Full notification body |
| `metadata` jsonb | Structured context (entity IDs, links) |
| `read` boolean | Whether recipient has seen it |
| `read_at` timestamptz | When it was marked read |
| `created_at` timestamptz | When the notification was generated |

Indexes: `(recipient_user_id, created_at DESC)`, partial unread
index `(recipient_user_id) WHERE read = false`, `(event_type)`.

### 1.2 Event types

| Event Type | Domain Event Source | Recipients |
| --- | --- | --- |
| `ALLOCATION_REQUESTED` | `workflow.instance.created` (allocation) | Super Admin, Stores Officers |
| `ALLOCATION_APPROVED` | `workflow.completed` (allocation, approved) | Requesting employee |
| `ALLOCATION_REJECTED` | `workflow.completed` (allocation, rejected) | Requesting employee |
| `ASSESSMENT_COMPLETED` | `assessment.completed` | Super Admins |
| `ASSET_RETURNED` | `return.completed` | Stores Officers |
| `REPAIR_REQUESTED` | `repair.opened` | IT Reps |
| `REPAIR_COMPLETED` | `repair.completed` | Repair creator |
| `DISPOSAL_APPROVED` | `disposal.approved` | Disposal requester |
| `ESCALATION` | Manual / future scheduler | Super Admins |
| `SLA_BREACH` | Manual / future scheduler | Super Admins |

### 1.3 Channel abstraction

```
NotificationChannelPort {
  channel: NotificationChannel
  send(recipient, subject, message, metadata?): Promise<void>
}
```

Currently implemented:
- **IN_APP** — persisted to `notifications` table via repository
- **EMAIL** — logs to console (production wiring replaces with SMTP)

Future channels (SMS, Teams, Slack) implement the same port and
register in `NotificationModule`'s `NOTIFICATION_CHANNELS` factory.

### 1.4 NotificationService

Orchestrator that:
1. Creates an in-app notification record
2. Iterates registered channel implementations
3. Swallows individual channel failures (logged, never blocks caller)

`send(input)` — single recipient
`sendToMany(recipients, eventType, subject, message)` — batch

### 1.5 Event handler

`NotificationEventHandler` listens to domain events via `@OnEvent`
and determines recipients:
- Known recipients from event payload (e.g. `createdByUserId`)
- Role-based lookup via raw SQL for role-targeted notifications
- Record lookup via `EntityManager` when the event payload lacks
  the target user (e.g. disposal requester from `disposal_records`)

### 1.6 HTTP surface (`/notifications`)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/notifications` | `notification:read` | Paginated, scoped to caller |
| GET | `/notifications/unread-count` | `notification:read` | Returns `{ count }` |
| PATCH | `/notifications/:id/read` | `notification:read` | Mark one as read |
| POST | `/notifications/mark-all-read` | `notification:read` | Batch mark all |

### 1.7 Frontend

- **NotificationBell** — header badge with live unread count (polls every 30s)
- **NotificationDrawer** — slide-out panel with notification list,
  filter (all/unread), mark-all-read button, click-to-mark-read
- **ActivityFeedPage** — full-page `/activity` route with event type
  filter, paginated list, available to all authenticated users

---

## 2. Reporting & Analytics

### 2.1 Architecture

No new tables — all reports aggregate from existing tables via raw
SQL queries through `EntityManager`. The `ReportingService` exposes
one method per report type, each accepting `ReportFilters`.

### 2.2 Report types

| Report | Endpoint | Key metrics |
| --- | --- | --- |
| Inventory | `/reports/inventory` | Asset counts by status, type, brand |
| Allocation | `/reports/allocation` | Monthly totals, approved/rejected split |
| Returns | `/reports/returns` | Monthly counts, by-reason breakdown |
| Repairs | `/reports/repairs` | By status, monthly trends, cost summary |
| Disposals | `/reports/disposals` | By status/reason, monthly trends |
| Employee History | `/reports/employee-asset-history/:userId` | Full asset timeline for one user |
| Department Summary | `/reports/department-summary` | Assets per department with status split |
| Compliance | `/reports/compliance` | Expired warranties, approaching expiry, never-assessed |
| SLA Performance | `/reports/sla-performance` | Avg/min/max workflow completion hours |
| Dashboard | `/reports/dashboard` | KPI summary + chart data (12-month trends) |

### 2.3 Filters

All report endpoints accept optional query parameters:

| Filter | Type | Used by |
| --- | --- | --- |
| `dateFrom` | ISO date string | Allocation, Returns, Repairs, Disposals, SLA |
| `dateTo` | ISO date string | Same as above |
| `department` | string | Inventory |
| `assetType` | string | Inventory |
| `brand` | string | Inventory |
| `employeeUserId` | UUID | Employee History |
| `status` | string | Most report types |

### 2.4 Export services

| Format | Implementation | Content-Type |
| --- | --- | --- |
| CSV | `csv-stringify` (already installed) | `text/csv` |
| Excel | SpreadsheetML XML (no external deps) | `application/vnd.ms-excel` |
| PDF | Raw PDF 1.4 with Courier font table | `application/pdf` |

Export endpoint: `GET /reports/export?reportType=...&format=csv|excel|pdf`

The controller flattens report data into a tabular format, then
delegates to the appropriate export service.

### 2.5 HTTP surface (`/reports`)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/reports/inventory` | `report:read` | |
| GET | `/reports/allocation` | `report:read` | |
| GET | `/reports/returns` | `report:read` | |
| GET | `/reports/repairs` | `report:read` | |
| GET | `/reports/disposals` | `report:read` | |
| GET | `/reports/employee-asset-history/:userId` | `report:read` | |
| GET | `/reports/department-summary` | `report:read` | |
| GET | `/reports/compliance` | `report:read` | |
| GET | `/reports/sla-performance` | `report:read` | |
| GET | `/reports/dashboard` | `report:read` | |
| GET | `/reports/export` | `report:export` | `?reportType=...&format=csv` |

### 2.6 Frontend

#### Dashboard (`/dashboard`)

- 8 KPI stat cards (total assets, available, allocated, under repair,
  disposed, active repairs, pending disposals, total returns)
- Bar chart: monthly allocations (last 12 months)
- Bar chart: monthly returns (last 12 months)
- Pie chart: asset distribution by type

Charts rendered as inline SVG — no external charting library.

#### Reports page (`/reports`)

- Report type selector
- Filter bar: date range (DatePicker.RangePicker), department,
  asset type, brand, status inputs
- Dynamic report display: scalar metrics, object summaries,
  tabular data with auto-generated bar charts for chartable arrays
- Export buttons: CSV, Excel, PDF (downloads via Blob URL)

---

## 3. Permissions

| Permission | Granted to |
| --- | --- |
| `notification:read` | All roles (including Employee) |
| `notification:manage` | Super Admin |
| `report:read` | Super Admin, IT Rep, Stores Officer, P&C |
| `report:export` | Super Admin, IT Rep, Stores Officer, P&C |

---

## 4. Tests

New unit tests:

- `test/unit/notification/notification.entity.spec.ts` — entity creation, markAsRead, reconstitution (6 tests)
- `test/unit/notification/notification.service.spec.ts` — channel dispatch, error swallowing, batch send (5 tests)
- `test/unit/notification/mark-read.use-case.spec.ts` — access control, not-found guard (3 tests)

Full suite: **194 passing**.
