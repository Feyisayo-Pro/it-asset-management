import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1721000000000
  implements MigrationInterface
{
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `CREATE INDEX "ix_assets_department" ON "assets" ("department")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_office_location" ON "assets" ("office_location")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_brand" ON "assets" ("brand")`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_warranty_expiry" ON "assets" ("warranty_expiry") WHERE "warranty_expiry" IS NOT NULL`,
    );
    await qr.query(
      `CREATE INDEX "ix_assets_created_at" ON "assets" ("created_at" DESC)`,
    );

    await qr.query(
      `CREATE INDEX "ix_workflow_instances_created_at" ON "workflow_instances" ("created_at" DESC)`,
    );
    await qr.query(
      `CREATE INDEX "ix_workflow_instances_started_by" ON "workflow_instances" ("started_by_user_id")`,
    );

    await qr.query(
      `CREATE INDEX "ix_return_records_created_at" ON "return_records" ("created_at" DESC)`,
    );

    await qr.query(
      `CREATE INDEX "ix_repair_records_reported_at" ON "repair_records" ("reported_at" DESC)`,
    );

    await qr.query(
      `CREATE INDEX "ix_disposal_records_requested_at" ON "disposal_records" ("requested_at" DESC)`,
    );

    await qr.query(
      `CREATE INDEX "ix_audit_logs_action" ON "audit_logs" ("action")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "ix_audit_logs_action"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_disposal_records_requested_at"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_repair_records_reported_at"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_return_records_created_at"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_workflow_instances_started_by"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_workflow_instances_created_at"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_assets_created_at"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_assets_warranty_expiry"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_assets_brand"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_assets_office_location"`);
    await qr.query(`DROP INDEX IF EXISTS "ix_assets_department"`);
  }
}
