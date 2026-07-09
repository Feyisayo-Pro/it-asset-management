# IT Asset Lifecycle Management & Workflow Platform — Requirements Documentation

Phase 1 (Analysis) output, produced from `../PROJECT_PROMPT.md`. No
implementation code exists yet — this is the discovery/requirements
deliverable, per the prompt's own Phase 1 instruction ("Analyze
requirements — Ask clarifying questions — Recommend improvements").

Read in this order:

1. [`01-business-requirements.md`](01-business-requirements.md) — what the
   business actually asked for, extracted and numbered (`BR-xxx`).
2. [`02-gaps-and-ambiguities.md`](02-gaps-and-ambiguities.md) — what's
   missing or unclear, with severity (`GAP-xx`). **Start here if you only
   read one file** — several items are blockers for schema design,
   starting with GAP-01 (the four source forms were never actually
   supplied).
3. [`03-workflow-improvements.md`](03-workflow-improvements.md) — proposed
   improvements on top of the stated rules (`WF-xx`).
4. [`04-risks-and-edge-cases.md`](04-risks-and-edge-cases.md) — business,
   security, and technical risks, plus concrete edge cases the design must
   handle (`R-xx` / `E-xx`).
5. [`05-SRS.md`](05-SRS.md) — Software Requirements Specification:
   numbered functional requirements (`FR-xxx`) and non-functional
   requirements (`NFR-xxx`), traced back to `BR-xxx`.
6. [`06-PRD.md`](06-PRD.md) — Product Requirements Document: problem
   statement, personas, user journeys, MoSCoW feature priority, release
   strategy.
7. [`07-modules.md`](07-modules.md) — every module to be built, including
   ones implied but not explicitly named in the prompt (Workflow Engine,
   Vendor Management, Master Data, Import Tool), with dependency map.
8. [`08-milestones.md`](08-milestones.md) — phased delivery plan from
   discovery through go-live and post-launch backlog.

## Status

**Draft, pending stakeholder sign-off.** The SRS and PRD both encode
explicit assumptions (SRS §2.5) wherever a `GAP-xx` has no confirmed
answer yet. Before Phase 2 (Architecture — ER diagram, API contracts,
folder structure) begins, each GAP should be either answered by
stakeholders or the stated assumption explicitly accepted.
