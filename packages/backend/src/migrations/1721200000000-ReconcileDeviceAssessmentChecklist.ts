import { MigrationInterface, QueryRunner } from 'typeorm';

const TPL = '44444444-0000-0000-0000-000000000001';

/**
 * Reconciles the seeded standard-device-assessment template (v1,
 * seeded by AddDeviceAssessment1720600000000) against the real
 * DEVICE ASSESSMENT FORM.docx — see
 * docs/22-sapphire-virtual-source-data.md §3. The original 22-item /
 * 4-category checklist was written from a prompt summary before the
 * real form was available; the actual form has exactly 8 items.
 * Replaces the item set in place (same template id/key/version — no
 * completed assessment records exist yet to preserve a historical
 * item set for).
 */
const OLD_ITEMS: Array<[string, string, string]> = [
  ['screen', 'Screen', 'Hardware'],
  ['keyboard', 'Keyboard', 'Hardware'],
  ['battery', 'Battery', 'Hardware'],
  ['charger', 'Charger', 'Hardware'],
  ['mouse', 'Mouse', 'Hardware'],
  ['webcam', 'Webcam', 'Hardware'],
  ['speakers', 'Speakers', 'Hardware'],
  ['microphone', 'Microphone', 'Hardware'],
  ['usb_ports', 'USB Ports', 'Hardware'],
  ['hdmi', 'HDMI', 'Hardware'],
  ['wifi', 'WiFi', 'Hardware'],
  ['bluetooth', 'Bluetooth', 'Hardware'],
  ['operating_system', 'Operating System', 'Software'],
  ['antivirus', 'Antivirus', 'Software'],
  ['encryption', 'Encryption', 'Software'],
  ['company_software', 'Company Software', 'Software'],
  ['disk_encryption', 'BitLocker / FileVault', 'Software'],
  ['asset_sticker', 'Asset Sticker', 'Software'],
  ['water_damage', 'No Water Damage', 'Condition'],
  ['physical_damage', 'No Physical Damage', 'Condition'],
  ['missing_components', 'No Missing Components', 'Condition'],
  ['boots_successfully', 'Boots Successfully', 'Condition'],
];

// Order matches DEVICE ASSESSMENT FORM.docx exactly.
const NEW_ITEMS: Array<[string, string, string]> = [
  ['screen_intact', 'Screen Intact', 'Hardware'],
  ['keyboard_functional', 'Keyboard Functional', 'Hardware'],
  ['charger_available', 'Charger Available', 'Hardware'],
  ['no_water_damage', 'No Water Damage', 'Condition'],
  ['no_missing_components', 'No Missing Components', 'Condition'],
  ['hard_drive_functional', 'Hard Drive Functional', 'Hardware'],
  ['os_functional', 'Operating System Functional', 'Software'],
  ['device_powers_on', 'Device Powers On', 'Hardware'],
];

export class ReconcileDeviceAssessmentChecklist1721200000000
  implements MigrationInterface
{
  name = 'ReconcileDeviceAssessmentChecklist1721200000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `DELETE FROM "assessment_template_items" WHERE "template_id" = $1`,
      [TPL],
    );
    let sort = 0;
    for (const [code, label, category] of NEW_ITEMS) {
      sort += 1;
      await qr.query(
        `INSERT INTO "assessment_template_items"
          ("id","template_id","code","label","category","required","sort_order")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,true,$5)`,
        [TPL, code, label, category, sort],
      );
    }
    await qr.query(
      `UPDATE "assessment_templates" SET "description" = $2 WHERE "id" = $1`,
      [TPL, 'Digitized device inspection checklist — matches DEVICE ASSESSMENT FORM.docx exactly (8 items)'],
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `DELETE FROM "assessment_template_items" WHERE "template_id" = $1`,
      [TPL],
    );
    let sort = 0;
    for (const [code, label, category] of OLD_ITEMS) {
      sort += 1;
      await qr.query(
        `INSERT INTO "assessment_template_items"
          ("id","template_id","code","label","category","required","sort_order")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,true,$5)`,
        [TPL, code, label, category, sort],
      );
    }
    await qr.query(
      `UPDATE "assessment_templates" SET "description" = $2 WHERE "id" = $1`,
      [TPL, 'Digitized device inspection checklist: hardware, software, condition'],
    );
  }
}
