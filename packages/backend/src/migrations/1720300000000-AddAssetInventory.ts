import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asset aggregate: assets + asset_accessories + asset_status_history.
 * asset_status_history is append-only (guarded at the repository).
 */
export class AddAssetInventory1720300000000 implements MigrationInterface {
  name = 'AddAssetInventory1720300000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "assets" (
        "id" uuid PRIMARY KEY,
        "asset_tag" varchar(64) NOT NULL,
        "device_type" varchar(64) NOT NULL,
        "brand" varchar(128) NOT NULL,
        "model" varchar(128) NOT NULL,
        "serial_number" varchar(128) NOT NULL,
        "imei" varchar(32),
        "purchase_date" date,
        "purchase_amount_cents" bigint,
        "purchase_currency" char(3) NOT NULL DEFAULT 'USD',
        "vendor" varchar(255),
        "warranty_expiry" date,
        "office_location" varchar(128),
        "department" varchar(128),
        "current_holder_id" uuid,
        "status" varchar(32) NOT NULL DEFAULT 'Registration',
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_assets_asset_tag" UNIQUE ("asset_tag"),
        CONSTRAINT "uq_assets_serial_number" UNIQUE ("serial_number")
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX "uq_assets_imei_notnull" ON "assets" ("imei") WHERE "imei" IS NOT NULL`,
    );
    await qr.query(`CREATE INDEX "ix_assets_status" ON "assets" ("status")`);
    await qr.query(
      `CREATE INDEX "ix_assets_holder" ON "assets" ("current_holder_id")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_device_type" ON "assets" ("device_type")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_asset_tag_prefix" ON "assets" (lower("asset_tag"))`,
    );

    await qr.query(`
      CREATE TABLE "asset_accessories" (
        "id" uuid PRIMARY KEY,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
        "name" varchar(128) NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "notes" text,
        CONSTRAINT "uq_asset_accessories_name" UNIQUE ("asset_id", "name")
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_asset_accessories_asset_id" ON "asset_accessories" ("asset_id")`,
    );

    await qr.query(`
      CREATE TABLE "asset_status_history" (
        "id" uuid PRIMARY KEY,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
        "from_status" varchar(32),
        "to_status" varchar(32) NOT NULL,
        "changed_by_user_id" uuid,
        "reason" text,
        "occurred_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_asset_status_history_asset_id" ON "asset_status_history" ("asset_id", "occurred_at" DESC)`,
    );

    // Give STORES_OFFICER and IT_REP visibility on assets they don't
    // manage; SUPER_ADMIN already gets everything via the initial seed.
    await qr.query(
      `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES
        ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006')
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "asset_status_history"`);
    await qr.query(`DROP TABLE IF EXISTS "asset_accessories"`);
    await qr.query(`DROP TABLE IF EXISTS "assets"`);
  }
}
