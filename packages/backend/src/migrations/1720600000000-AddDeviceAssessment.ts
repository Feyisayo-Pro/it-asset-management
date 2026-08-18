import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Device Assessment module: versioned checklist templates + assessment
 * records. The checklist is DATA — the seeded standard template
 * digitizes the paper form; future inspection types are new template
 * rows, not code changes.
 */
export class AddDeviceAssessment1720600000000 implements MigrationInterface {
  name = 'AddDeviceAssessment1720600000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "assessment_templates" (
        "id" uuid PRIMARY KEY,
        "key" varchar(64) NOT NULL,
        "version" int NOT NULL DEFAULT 1,
        "name" varchar(128) NOT NULL,
        "description" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_assessment_templates_key_version" UNIQUE ("key","version")
      )
    `);

    await qr.query(`
      CREATE TABLE "assessment_template_items" (
        "id" uuid PRIMARY KEY,
        "template_id" uuid NOT NULL REFERENCES "assessment_templates"("id") ON DELETE CASCADE,
        "code" varchar(64) NOT NULL,
        "label" varchar(128) NOT NULL,
        "category" varchar(32) NOT NULL,
        "required" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "uq_assessment_template_items_code" UNIQUE ("template_id","code")
      )
    `);

    await qr.query(`
      CREATE TABLE "assessment_records" (
        "id" uuid PRIMARY KEY,
        "template_id" uuid NOT NULL REFERENCES "assessment_templates"("id") ON DELETE RESTRICT,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
        "context_type" varchar(32) NOT NULL DEFAULT 'Standalone',
        "context_id" varchar(64),
        "status" varchar(16) NOT NULL DEFAULT 'Draft',
        "technician_user_id" uuid NOT NULL,
        "outcome" varchar(32),
        "findings" text,
        "recommendations" text,
        "photo_urls" jsonb,
        "signature_name" varchar(255),
        "signature_ip" varchar(64),
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_assessment_records_asset" ON "assessment_records" ("asset_id", "created_at" DESC)`,
    );
    await qr.query(
      `CREATE INDEX "ix_assessment_records_context" ON "assessment_records" ("context_type","context_id")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assessment_records_status" ON "assessment_records" ("status")`,
    );

    await qr.query(`
      CREATE TABLE "assessment_item_results" (
        "id" uuid PRIMARY KEY,
        "record_id" uuid NOT NULL REFERENCES "assessment_records"("id") ON DELETE CASCADE,
        "item_code" varchar(64) NOT NULL,
        "result" varchar(8) NOT NULL,
        "note" text,
        CONSTRAINT "uq_assessment_item_results" UNIQUE ("record_id","item_code")
      )
    `);

    // ---- Seed the standard device assessment template v1 ----
    const TPL = '44444444-0000-0000-0000-000000000001';
    await qr.query(
      `INSERT INTO "assessment_templates" ("id","key","version","name","description","is_active")
       VALUES ($1,'standard-device-assessment',1,'Standard Device Assessment',
        'Digitized device inspection checklist: hardware, software, condition',true)`,
      [TPL],
    );

    const items: Array<[string, string, string]> = [
      // Hardware
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
      // Software
      ['operating_system', 'Operating System', 'Software'],
      ['antivirus', 'Antivirus', 'Software'],
      ['encryption', 'Encryption', 'Software'],
      ['company_software', 'Company Software', 'Software'],
      ['disk_encryption', 'BitLocker / FileVault', 'Software'],
      ['asset_sticker', 'Asset Sticker', 'Software'],
      // Condition
      ['water_damage', 'No Water Damage', 'Condition'],
      ['physical_damage', 'No Physical Damage', 'Condition'],
      ['missing_components', 'No Missing Components', 'Condition'],
      ['boots_successfully', 'Boots Successfully', 'Condition'],
    ];
    let sort = 0;
    for (const [code, label, category] of items) {
      sort += 1;
      await qr.query(
        `INSERT INTO "assessment_template_items"
          ("id","template_id","code","label","category","required","sort_order")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,true,$5)`,
        [TPL, code, label, category, sort],
      );
    }

    // Permissions
    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-000000000010', 'assessment:read', 'Read device assessments'),
        ('22222222-0000-0000-0000-000000000011', 'assessment:manage', 'Create and complete device assessments')`,
    );
    const READ = '22222222-0000-0000-0000-000000000010';
    const MANAGE = '22222222-0000-0000-0000-000000000011';
    const SA = '11111111-0000-0000-0000-000000000001';
    const ST = '11111111-0000-0000-0000-000000000002';
    const IT = '11111111-0000-0000-0000-000000000003';
    const PC = '11111111-0000-0000-0000-000000000004';
    const grants: Array<[string, string]> = [
      [SA, READ], [SA, MANAGE],
      [IT, READ], [IT, MANAGE],
      [ST, READ],
      [PC, READ],
    ];
    for (const [rid, pid] of grants) {
      await qr.query(
        `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [rid, pid],
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    for (const pid of [
      '22222222-0000-0000-0000-000000000010',
      '22222222-0000-0000-0000-000000000011',
    ]) {
      await qr.query(`DELETE FROM "role_permissions" WHERE "permission_id" = $1`, [pid]);
      await qr.query(`DELETE FROM "permissions" WHERE "id" = $1`, [pid]);
    }
    await qr.query(`DROP TABLE IF EXISTS "assessment_item_results"`);
    await qr.query(`DROP TABLE IF EXISTS "assessment_records"`);
    await qr.query(`DROP TABLE IF EXISTS "assessment_template_items"`);
    await qr.query(`DROP TABLE IF EXISTS "assessment_templates"`);
  }
}
