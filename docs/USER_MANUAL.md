# User Manual

This manual describes what each role can do in the IT Asset Lifecycle
Management platform, organized by who needs it: everyone, non-Employee
staff, and Super Admins. Feature availability is enforced server-side by
role and permission (see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md#rbac-configuration)
for the exact matrix) — the UI shows only what your account is allowed to
use.

## Roles at a glance

| Role | Summary |
|---|---|
| **Super Admin** | Full system access: user management, all asset/return/repair/disposal actions, RBAC, audit logs, workflow configuration, direct asset status overrides. |
| **Stores Officer** | Registers and manages asset inventory, initiates disposal requests, views reports. |
| **IT Rep** | Performs device assessments, manages repairs, participates in the return sign-off chain, views reports. |
| **People & Culture (P&C)** | Owns employee-facing lifecycle events: initiating/cancelling returns, final sign-off on returns, employee records, views reports. |
| **Employee** | Requests/uses their own assigned assets, initiates their own returns, signs off on their own return, views their own dashboard and notifications. |

---

## For All Users

### Logging in

1. Navigate to the application URL.
2. Enter your email and password on the login screen.
3. On success you receive a session (access + refresh token pair, handled
   automatically by the app) and land on your role-appropriate dashboard.
4. If your account was just created by an administrator with "must change
   password" set, you'll be prompted to set a new password immediately
   after your first login.
5. **Forgotten password:** use "Forgot password?" on the login screen and
   enter your email. If the address matches an account, a reset link is
   emailed to you (valid for a limited time — 30 minutes by default).
   Following the link lets you set a new password.
6. **Account lockout:** after several consecutive failed login attempts,
   the account is temporarily locked (defaults: 5 attempts, 15-minute
   lockout) as a brute-force protection. Wait for the lockout window to
   pass, or ask a Super Admin to investigate.

### Changing your password

From your account/profile menu, choose "Change password", supply your
current password and a new password (minimum 12 characters), and submit.
For security, changing your password signs you out of **every** device —
you'll need to log in again anywhere else you were signed in.

### Dashboard

Every role lands on an **Enterprise Dashboard** after login, tailored to
their permissions:

- **KPI tiles:** total assets, available, allocated, under repair,
  returned, disposed, lost, stolen, plus pending requests/approvals
  relevant to your role.
- **Charts:** assets by department/brand/type, allocation/return/repair
  trends over time, and compliance performance.
- **Widgets:** recent activity feed, your notifications, pending tasks
  awaiting your action, upcoming warranty expirations, recent repairs,
  and recently added assets.
- **Filters:** narrow the dashboard by department, office, asset type, and
  date range.

Employees see a narrower dashboard scoped to information relevant to them
(their own assets, their own pending tasks); Staff and Super Admin see the
full organizational view.

### Notifications

A bell/notification icon shows your personal notification feed:

- View a paginated list of notifications, optionally filtered to unread
  only or by event type (allocation requested/approved/rejected,
  assessment completed, asset returned, repair requested/completed,
  disposal approved, escalation, SLA breach).
- See your current unread count at a glance.
- Mark a single notification as read, or mark all as read at once.

Notifications are generated automatically as you and others interact with
assets — e.g. an Employee is notified when their return is fully signed
off; an IT Rep is notified when items are recorded against a return
awaiting assessment.

### Returns (asset return workflow)

Any authenticated user can view returns they're involved in; Employees see
only returns they personally initiated. The return process is a
multi-stage, multi-signature workflow:

1. **Initiate** — an Employee (or People & Culture, or Super Admin) starts
   a return against an asset currently allocated to them, selecting a
   reason (Resignation, Termination, Transfer, Replacement, Repair, Lost,
   Other) and optional notes. State: `Initiated`.
2. **Record items** — an IT Rep or Stores Officer records what was
   physically handed back (item type, condition status: Returned /
   Missing / Damaged, notes). State moves to `Assessment`.
3. **Complete assessment** — an IT Rep records findings and an outcome
   (Pass, Repair Recommended, Replacement Recommended, Reject), with
   optional damage notes, missing-accessory notes, and photos. State moves
   to `AwaitingEmployeeSignature`.
4. **Employee sign-off** — the Employee reviews and signs (typed
   signature name). State moves to `AwaitingItSignature`.
5. **IT sign-off** — the IT Rep signs. State moves to `AwaitingPcSignature`.
6. **P&C sign-off** — People & Culture signs, completing the return. State
   becomes `Completed`; the notifying parties (Employee, Stores Officer)
   are notified.

At any point before assessment completes, People & Culture (or Super
Admin) may **cancel** the return with a reason, moving it to `Cancelled`
instead.

Each return's detail view shows the live workflow state, which actions are
currently available to you, and the full transition history (who acted,
when, and any comment/signature).

---

## For Staff (Stores Officer, IT Rep, People & Culture, Super Admin)

Everything in this section requires a non-Employee role — the UI hides
these areas entirely for Employee accounts, and the API enforces the same
restriction server-side.

### Asset management

*Full access: Stores Officer, Super Admin. Read-only: IT Rep, People & Culture.*

- **Browse/search** the asset register: filter by status, device type,
  brand, department, or current holder; sort by tag, serial number,
  status, or creation date.
- **View asset detail**, including its full status-change history, a
  scannable QR code, and a printable barcode (both encode the asset tag).
- **Register a new asset** (Stores Officer/Super Admin): device type,
  brand, model, serial number, optional IMEI, purchase details (date,
  amount, currency, vendor), warranty expiry, location/department, and
  notes. New assets start in `Registration` unless marked available
  immediately.
- **Edit asset details** (Stores Officer/Super Admin).
- **Bulk import** assets from a CSV file (Stores Officer/Super Admin),
  with a dry-run mode to validate before committing.
- **Export** the filtered asset list to CSV.
- **Direct status override** (Super Admin only) — force an asset directly
  into a new lifecycle status (e.g. recovering a `Lost` asset to
  `Available`) with a reason, bypassing the normal workflow. Use sparingly;
  this is an audited, permission-gated escape hatch, not the everyday path.

**Normal asset lifecycle** (enforced by the domain state machine):

```
Registration → Available → Reserved → Allocated → Returned → Available
                   │            │           │
                   ├──────► UnderRepair ◄────┘
                   │            │
                   └──────► Disposed (via approved disposal)
                   │
                   ├──────► Lost / Stolen ──► Unaccounted / Available
```

Every status change is recorded in the asset's history with who changed
it, when, and why.

### Assessments (device condition checks)

*Full access (start/manage): IT Rep, Super Admin. Read-only: Stores Officer, People & Culture.*

Assessments record a structured condition check against an asset —
standalone, or attached to a return/repair/allocation context.

1. **Start an assessment** against an asset, optionally tagging it with a
   context (Standalone, Allocation, Return, Repair) and a checklist
   template (defaults to the standard device template if omitted).
2. **Record checklist results** — for each checklist item, mark Pass /
   Fail / NA with an optional note. Results can be saved incrementally as
   you work through the checklist.
3. **Complete the assessment** — submit a final outcome (Pass, Repair
   Recommended, Replacement Recommended, Reject), overall findings,
   optional recommendations and photos, and a signature name. Once
   completed, the assessment is locked.

Assessment templates and past assessment records for an asset are browsable
by anyone with assessment read access.

### Repairs

*Full access (open/manage): IT Rep, Super Admin. Read-only: Stores Officer, People & Culture.*

1. **Open a repair ticket** against an asset with the reported fault, and
   optionally the affected employee, an assigned technician, a vendor, and
   an estimated cost.
2. **Update** technician assignment, vendor, or cost estimate as the
   repair progresses.
3. **Transition status** through the repair lifecycle: `Pending` →
   `Diagnosing` → (`AwaitingParts` |) `InProgress` → `Completed` /
   `Failed` / `BeyondRepair`, recording diagnosis, resolution notes, and
   actual cost as you go. `Failed` isn't a dead end — a failed repair can
   be re-attempted (`Failed → InProgress`); `Completed` and `BeyondRepair`
   are terminal.
4. **Browse** all repairs for a given asset, or search/filter the full
   repair log by status or technician.

### Disposals

*Request access: Stores Officer, Super Admin. Approve/reject: Super Admin only. Read-only: IT Rep, People & Culture.*

1. **Request a disposal** for an asset: choose a reason (Beyond Repair,
   Obsolete, Lost, Sold, Donated, Damaged) and method (E-Waste Recycling,
   Sold, Donated, Destroyed, Returned to Vendor, Other), with optional
   notes and supporting evidence/photo URLs.
2. **Approve** (Super Admin) — record the approver's printed signature
   name, the disposal date, an optional witness, and approval notes.
   Approving a disposal automatically moves the underlying asset to the
   `Disposed` status — final and only reversible by a Super Admin's direct
   status override.
3. **Reject** (Super Admin) — record a rejection reason; the asset is
   unaffected and can have a new disposal requested later.
4. **Browse** disposal requests by status, requester, or approver, or view
   the disposal history for a specific asset.

### Reports

*Available to: Stores Officer, IT Rep, People & Culture, Super Admin (not Employee).*

A reporting suite covering:

- **Inventory** — full asset register snapshot, filterable by date range,
  department, asset type, brand, or status.
- **Allocation** — who currently holds what, and allocation history.
- **Returns** — return volume, reasons, and turnaround.
- **Repairs** — repair volume, cost, and turnaround.
- **Disposals** — disposal volume, reasons, and methods.
- **Employee asset history** — full asset history for one specific
  employee.
- **Department summary** — asset counts and value rolled up by department.
- **Compliance** — policy/process adherence indicators.
- **SLA performance** — turnaround-time performance against targets.
- **Dashboard analytics** — the same aggregate data that feeds the
  Enterprise Dashboard, available as a standalone report.

Any report can be **exported** to CSV, Excel, or PDF from the reports
screen.

---

## For Super Admin

In addition to everything above, Super Admin has exclusive access to:

### User management

- **List/search users** — filter by role, active/inactive, free-text
  search; sort by name, email, last login, or creation date.
- **Create a user** — first/last name, email, role assignment, initial
  password (12+ characters), and whether they must change their password
  on first login.
- **View/edit a user** — update name/email.
- **Reassign a user's role** — moves them between the five fixed roles.
  Blocked if it would leave the system with zero Super Admins, and you
  cannot change your own role this way.
- **Deactivate a user** — disables their account (they can no longer log
  in); blocked if it would deactivate the last remaining Super Admin or if
  you try to deactivate your own account.
- **Reactivate a user** — re-enables a previously deactivated account.

### Audit logs

- **Browse the full audit trail** — every significant state change in the
  system (asset status changes, user management actions, return/repair/
  disposal transitions, etc.) is recorded with who did it, when, from what
  IP, the old and new values, and a correlation ID you can cross-reference
  against server logs.
- **Filter** by acting user, entity type, entity ID, action, or date
  range.
- **View a single audit entry** in full detail.

Audit logs are read-only and exist purely for accountability/compliance
review — see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) for retention and
operational guidance.
