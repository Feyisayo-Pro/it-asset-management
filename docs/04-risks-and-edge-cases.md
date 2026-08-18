# Risks & Edge Cases

## Business / Operational Risks

- **R-1 Data quality on migration** — Legacy Excel/paper data likely has
  duplicate or missing serial numbers, inconsistent department names, and
  incomplete purchase records. Importing it as-is will corrupt the "single
  source of truth" from day one. *Mitigation*: dedicated data-cleansing pass
  and import validation (see WF-11) before go-live.

- **R-2 Workflow rigidity drives shadow processes** — A hard "no stage
  skipped" rule with no escape hatch (GAP-04) risks staff quietly reverting
  to paper/email for urgent allocations, which is the exact behavior the
  project exists to eliminate. *Mitigation*: WF-1 expedited path with full
  audit visibility.

- **R-3 Adoption resistance** — Requiring digital signatures and multi-party
  sign-off may be perceived as slower than today's paper process by
  employees and managers used to informal handoffs. *Mitigation*: phased
  rollout, training, and measuring/publishing actual cycle-time improvements
  (see PRD success metrics).

- **R-4 Escalation fatigue** — Automated manager emails on every SLA breach
  (BR-14.2) can be ignored if too frequent. *Mitigation*: WF-10 digesting,
  and escalate to the next level only if the first escalation itself times
  out.

- **R-5 Unaccounted assets on offboarding** — Without an automatic trigger
  (GAP-16/WF-4), an employee can leave without their asset being reclaimed,
  permanently reducing fleet visibility.

- **R-6 Disposal irreversibility** — A single authorized user with no
  maker-checker control (GAP-08) could dispose of an asset in error or
  maliciously with no compensating control beyond after-the-fact audit log
  review.

## Security & Compliance Risks

- **R-7 High-value target** — The system centralizes employee PII, asset
  location/possession data, and financial (purchase amount) data — a single
  compromised account has broad blast radius. RBAC must be enforced
  server-side on every endpoint (BR-3.3), not assumed from UI hiding.

- **R-8 Audit log tampering** — "Immutable audit logs" (BR-13.3) is a
  requirement, not a default database behavior; without append-only storage
  or hash-chaining, a privileged user (e.g., a compromised Super Admin
  account) could still alter history. Needs explicit architectural
  treatment in Phase 2.

- **R-9 Signature legal defensibility** — Until GAP-03 is resolved, whatever
  "signature" implementation is built may not hold up as proof of consent if
  ever challenged (e.g., a disputed disciplinary case citing a return
  form).

## Technical / Scalability Risks

- **R-10 Allocation race condition** — Two Stores Officers (or automated
  flows) could attempt to select the same `Available` asset simultaneously.
  Needs optimistic locking / row-level locking at the data layer, not just
  UI-level prevention.

- **R-11 Reporting load on operational database** — Dashboard charts and
  exportable reports (PDF/Excel/CSV) run heavy aggregate queries; without
  read-replica or reporting-schema separation, this can degrade the
  transactional workflow experience during business hours.

- **R-12 Offline warehouse scanning** — If Stores operates in
  low-connectivity storage areas (GAP-21), a purely online scan-to-update
  flow will be unusable exactly where it's needed most.

## Edge Cases to Design For

- **E-1 Asset physically with a vendor, not the employee** — Employee
  resigns while their laptop is out for repair. The Return workflow must
  handle "no physical item to hand back right now" rather than assuming the
  asset is in the employee's possession.

- **E-2 Partial return** — Employee returns the laptop but not the charger
  or bag. The return record must support item-level Present/Missing per
  accessory (see WF-5), with a follow-up action (payroll deduction ticket,
  reminder) rather than blocking the whole return.

- **E-3 Lost/Stolen asset with a live allocation** — An asset marked Lost or
  Stolen is still logically "allocated" to someone for cost-recovery/
  investigation purposes. Status transitions must allow `Allocated →
  Lost/Stolen` directly (bypassing Returned), and needs an incident
  reference field (police report #, date reported).

- **E-4 Recovered / disposal reversal** — A disposed asset is later found
  in storage (process error). The lifecycle as given is one-directional
  ending in Disposal; the model needs a `Disposed → Recovered` correction
  path that re-enters inventory with full audit trail, since disposed
  assets are never deleted (BR-12.3) but also can't be permanently
  unusable if the disposal itself was erroneous.

- **E-5 Concurrent open requests on the same asset** — Employee submits a
  Replacement request while their current device already has an open Repair
  request. The system should detect and either merge or block the
  duplicate rather than allow two independent workflows to act on the same
  asset.

- **E-6 First request vs. additional request ambiguity** — "New Device" vs.
  "Additional Device" request types (GAP-09) need a system rule: is New
  Device only valid when the employee currently holds zero assets of that
  device type?

- **E-7 Shared/pool assets** — A conference-room display or a floating
  loaner laptop has no single "Current Holder" employee (GAP-11); the
  allocation model needs a location/department holder option distinct from
  an individual employee.

- **E-8 Device-type-conditional fields** — IMEI, screen size, etc. only
  apply to certain Device Types (GAP-13); the inventory form must adapt
  required fields by type rather than exposing every field for every asset.

- **E-9 In-warranty vs. out-of-warranty repair cost** — Repair records cost
  and vendor, but warranty status at time of repair determines who bears
  the cost; without capturing warranty state at repair time, cost reporting
  will be misleading if warranty later expires and history is queried.

- **E-10 Multi-currency purchase amounts** — If offices span countries
  (GAP-14), aggregate financial reports (e.g., total asset value by
  department) are wrong unless currency is captured and normalized.
