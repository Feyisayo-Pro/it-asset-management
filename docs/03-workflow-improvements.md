# Workflow Improvement Recommendations

These are proposed improvements *on top of* the business rules in the
prompt — none contradict the source rules, they close gaps or reduce
operational friction. Each references the `GAP-xx` it addresses where
applicable. Final adoption is a stakeholder decision, not an assumption
baked silently into the SRS.

## WF-1 — Controlled exception path for allocation (addresses GAP-04)

Add an explicit **"Expedited Allocation"** sub-workflow: a Super Admin (or a
designated escalation role) can force-advance a request past a stage, but
only if they record a mandatory reason, and the action is flagged
`bypassed: true` on the workflow history and surfaced on the Compliance
dashboard. This preserves "no silent skipping" while giving the business a
safety valve — the alternative (a hard block) predictably causes staff to
revert to paper for urgent cases, defeating BR-1.2.

## WF-2 — Parallelizable workflow stages where order doesn't matter

The current allocation sequence is fully serial (P&C Review → Stores Select
→ IT Assessment). Stores selecting a candidate asset and IT assessing the
employee's existing device (if this is a replacement) don't necessarily
depend on each other. Model the workflow engine to support **AND-join gates**
(multiple parallel steps that must all complete before advancing), not just
a linear chain — configurable per workflow definition, not hardcoded. This
shortens allocation lead time without violating "no stage skipped" (all
stages still execute, just concurrently where safe).

## WF-3 — SLA timers with automatic escalation, not just batch reporting

Rather than the Compliance module discovering breaches after the fact, give
every workflow state a configurable SLA duration; when it's exceeded, fire
an escalation notification immediately (to the assignee's manager, per
BR-14.2) instead of waiting for a scheduled compliance report. This turns
Compliance from a lagging report into a live control. (Resolves GAP-02 once
thresholds are supplied — the mechanism doesn't need the exact numbers to be
designed now.)

## WF-4 — Event-driven return trigger from employment status change

When an Employee's `Employment Status` changes to Resigned/Terminated
(whether via manual P&C edit or a future HRIS webhook, GAP-16), auto-create
a draft Return workflow for every asset currently held by that employee,
assigned to P&C for confirmation rather than requiring someone to remember
to start it manually. This directly reduces "Unaccounted" assets, one of the
statuses the business explicitly wants visibility into.

## WF-5 — Asset "kits" instead of a free-text Accessories field (addresses GAP-12)

Model a **kit/bundle** concept: a parent asset (e.g., laptop) can have
child accessory records (charger, bag, mouse, dock), each independently
trackable as Present/Missing/Damaged at issuance and at return. This lets
"Missing Items" on a return reference actual accessory records instead of
free text, and lets Stores report accessory shrinkage over time.

## WF-6 — Reservation with mandatory expiry (addresses GAP-10)

A `Reserved` asset must carry a reservation expiry timestamp and the
reserving user/workflow reference. A scheduled job releases expired
reservations back to `Available` and notifies the reserving party. Prevents
inventory from silently looking scarcer than it is.

## WF-7 — Vendor as shared master data (addresses GAP-15)

Promote Vendor to its own entity referenced by Acquisition, Repair, and
Disposal (evidence/pickup vendor), carrying contact info and optionally
contract/SLA terms. Avoids duplicate/inconsistent vendor names across
modules and enables a "spend by vendor" report later.

## WF-8 — Defined Reject → next-state mapping (addresses GAP-06)

Give Device Assessment's `Reject` outcome an explicit next state chosen at
assessment time by the IT rep: `Send to Repair` or `Send to Disposal`
(pending approval). Don't leave it as a dead-end state.

## WF-9 — Delegation of approval authority

Allow a P&C or IT approver to designate a temporary delegate (date-bounded)
so a single person's absence doesn't stall every pending workflow — a common
real-world cause of "delayed approvals" that the Compliance module is meant
to catch, so it's cheaper to prevent than to only report on.

## WF-10 — Notification digesting

Rather than one email per event to every relevant party (BR-15.1), give
users a per-role default of immediate email for direct action-required
items (e.g., "you must sign") and a daily digest for passive/FYI events
(e.g., "an asset in your department was returned"). Reduces inbox fatigue
that leads to missed real approvals.

## WF-11 — Legacy data import & validation tool

Given "replace spreadsheet tracking" is a stated objective (GAP-19), the
rollout needs a bulk-import path with column mapping, duplicate-serial
detection, and a dry-run preview before committing — otherwise go-live
requires re-keying the entire existing fleet by hand.

## WF-12 — Barcode/QR-first Stores workflow

Design the Stores check-in/check-out screens to be scan-first (barcode/QR
scan populates the asset, minimal typing) rather than search-and-click, both
for speed and to reduce mis-selection errors during high-volume
onboarding/offboarding periods.
