# Sapphire Virtual — Source Data (IT Hardware Spec Matrix, SOPs, Baseline Inventory)

> Supplied directly by the client on 2026-08-18, resolving the "actual
> source documents were never supplied" caveat in `01-business-requirements.md`
> and `GAP-01`/`GAP-19` in `02-gaps-and-ambiguities.md`. Recorded here
> verbatim as the authoritative source. See those two files for the
> gaps this closes.
>
> **Update 2026-08-18**: the full baseline inventory workbook ("PHONE AND
> LAPTOP UPDATE AS AT JULY 14TH 2026.xlsx", both LAPTOPS and PHONES sheets —
> 136 + 73 real records, not just the 8+4 sample originally shown below) was
> also supplied and is checked into
> `packages/backend/src/database/seeds/source-data/`, seeded in full by
> `seed-full-inventory.ts` (`npm run seed:inventory:full`). §4 below is left
> as originally recorded (the sample only) for historical reference; it is no
> longer the seed script's data source.

---

## 1. IT Hardware Specifications Matrix

| Role Level | Minimum Processor Requirement | Minimum RAM | Minimum Storage | Notes / Special Guidelines |
| :--- | :--- | :--- | :--- | :--- |
| **Operatives** | Intel Core i3 or AMD Ryzen 3 equivalent | 8GB or Higher | 256GB SSD or Higher | Standard baseline staff |
| **Officers** | Intel Core i5 or AMD Ryzen 5 equivalent | 8GB or Higher | 256GB SSD or Higher | General operational roles |
| **Senior Officers** | Intel Core i5 or AMD Ryzen 5 equivalent | 8GB or Higher | 256GB SSD or Higher | Mid-level technical/ops |
| **Assistant Manager** | Intel Core i5 or AMD Ryzen 5 equivalent | 16GB or Higher | 512GB SSD or Higher | Management tier |
| **Manager** | Intel Core i5 or AMD Ryzen 5 equivalent | 16GB or Higher | 512GB SSD or Higher | Management tier |
| **Senior Manager** | Intel Core i5/i7 or AMD Ryzen 5/7 equivalent | 16GB or Higher | 512GB SSD or Higher | Senior leadership tier |
| **Assistant General Manager**| Intel Core i5/i7 or AMD Ryzen 5/7 equivalent | 16GB or Higher | 512GB SSD or Higher | Executive tier |
| **Deputy General Manager** | Intel Core i5/i7 or AMD Ryzen 5/7 equivalent | 16GB or Higher | 512GB SSD or Higher | Executive tier |
| **General Manager** | Intel Core i7/i9 / Ryzen equivalent / MacBook Pro | 16GB or Higher | 512GB SSD or Higher | Core i9 / MacBook Pro dedicated for Design roles |
| **Director** | Executive Custom Request | 16GB+ | 512GB+ SSD | Tailored per assignment |

## 2. Standard Operating Procedures (SOP) & Lifecycle Workflows

### SOP A: Device Issuance Protocol
1. **Request Initiation**: P&C sends official request email to IT detailing employee name, department, and job description.
2. **IT Recommendation**: IT matches the job role against the IT Hardware Specifications Matrix and specifies minimum hardware specs via email.
3. **P&C Request to Warehouse**: P&C requests stock matching IT recommendation from Stores/Warehouse.
4. **Warehouse Release**: Warehouse confirms stock and releases hardware to P&C.
5. **IT Technical Checklist Inspection**: IT conducts an 8-point device check before handoff.
6. **Sign-off & Delivery**: Digital signature captured across Employee, P&C, and IT.

### SOP B: Device Submission / Return Protocol
1. **Form Creation**: P&C logs return request and triggers QR code / Return form generation.
2. **Physical Collection**: Device handed over to P&C; QR code applied/scanned.
3. **IT Post-Return Assessment**: IT inspects the hardware condition and logs findings (`No Fault Found`, `Repair Recommended`, `Replacement Recommended`).
4. **Inventory Update**: Stores checks hardware back into `Available` or `Under Repair` inventory.

## 3. Form Schemas & Mandatory Checklists

### 8-Point IT Device Assessment Checklist
- [ ] Screen Intact
- [ ] Keyboard Functional
- [ ] Charger Available
- [ ] No Water Damage
- [ ] No Missing Components
- [ ] Hard Drive Functional
- [ ] Operating System Functional
- [ ] Device Powers On

**Assessment Outcomes**: `No Fault Found` · `Repair Recommended` · `Replacement Recommended`

**Return Reasons**: `Resignation` · `Termination` · `Replacement` · `Transfer` · `Other`

> **Reconciled 2026-08-18.** The assessment module originally implemented a
> 23-point checklist (see `01-business-requirements.md` BR-9.1) and a 4-value
> `AssessmentOutcome` enum (`Pass, RepairRecommended, ReplacementRecommended,
> Reject`), built from a prompt summary before this real form was available.
> Verified directly against `DEVICE ASSESSMENT FORM.docx` (not a paraphrase)
> and reconciled to the 8-point / 3-outcome scheme above — see
> `ReconcileDeviceAssessmentChecklist1721200000000` and the "Device Assessment
> Checklist" section of `CLAUDE.md`.

## 4. Baseline Inventory Data Summary

### Stock Summary
- **Laptops Tracked**: 136 records
- **Mobile Devices Tracked**: 73 records
- **Laptop Chargers Returned**: 27 (25 Lenovo, 2 HP)
- **Laptop Chargers Missing**: 18

> Only the sample rows below (8 laptops, 4 phones) were supplied — not
> the full 136+73 record set. `packages/backend/src/database/seeds/seed-initial-inventory.ts`
> seeds only this sample, not the full historical inventory.

### Initial Sample Records for Seeding

#### Laptops (Sample Dataset)
| S/N | Previously Assigned | Model / Serial Number | Newly Assigned | Department | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | OGUNSOLA GABRIEL | DESTOP-D7H20HQ | OGUNSOLA GABRIEL | FINANCE | ACTIVE |
| 2 | UNANMA GOODNESS | LENOVO DESKTOP -3D047L1 (LENOVO-PF4J6CFZ) | ESTHER NATHANIEL | RECOVERY | ACTIVE |
| 3 | DEBRAH ALEXANDER MARTINS | LENOVO-PF4N9WZC | MARYLAND WAREHOUSE | MARYLAND WAREHOUSE | INACTIVE |
| 4 | ADEDOLA ETIM | PF4N9WXX | ADEDOLA ETIM | RECOVERY | ACTIVE |
| 5 | RABIU KABIRAT | LENOVO-PF4K9930 | RABIU KABIRAT | PAYDAY LOAN | ACTIVE |
| 6 | ABAYOMI ELIJAH | LENOVO-PF453RPA | ABAYOMI ELIJAH | RECOVERY | ACTIVE |
| 7 | DENSU ALIYU | LENOVO-PF47KACX | DENSU ALIYU | PAYDAY LOAN | ACTIVE |
| 8 | DEBORAH AJALA | LENOVO-PF1458RV | DEBORAH AJALA | RECOVERY | ACTIVE |

#### Mobile Phones (Sample Dataset)
| S/N | Previously Assigned | Device Specification | IMEI Number | Newly Assigned | Department | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | OMOJOKUN BISOLA | SAMSUNG A05 LTE (4GB +64GB) | 354660975440853 | OMOJOKUN BISOLA | COLLECTIONS | ACTIVE |
| 2 | OKOYE GERALDINE | SAMSUNG A05 LTE (4GB +64GB) | 354660975438188 | OKOYE GERALDINE | SUPERVISOR, PAYDAY LOAN | ACTIVE |
| 3 | ODUNSI MOTUNRAYO | SAMSUNG A05 LTE (4GB +64GB) | 354660973116570 | ODUNSI MOTUNRAYO | COLLECTIONS | ACTIVE |
| 4 | ADEOLA IBITOYE | SAMSUNG A05 LTE (4GB +64GB) | 354660973117560 | ADEOLA IBITOYE | COLLECTIONS | ACTIVE |
