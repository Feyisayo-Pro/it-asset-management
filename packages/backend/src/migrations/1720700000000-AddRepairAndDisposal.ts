import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repair & Maintenance and Disposal schema, plus their permissions.
 * Both are lifecycle events for the Asset aggregate — status changes
 * flow through the existing ChangeAssetStatusUseCase (which enforces
 * the lifecycle state machine), keeping asset_status_history as the
 * single source of truth for the asset's timeline.
 */
export class AddRepairAndDisposal1720700000000 implements MigrationInterface {
  name = 'AddRepairAndDisposal1720700000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ---- Repairs ----
    await qr.query(`
      CREATE TABLE "repair_records" (
        "id" uuid PRIMARY KEY,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
        "employee_user_id" uuid,
        "technician_user_id" uuid,
        "vendor" varchar(255),
        "reported_fault" text NOT NULL,
        "diagnosis" text,
        "resolution_notes" text,
        "status" varchar(24) NOT NULL DEFAULT 'Pending',
        "estimated_cost_cents" bigint,
        "actual_cost_cents" bigint,
        "cost_currency" char(3) NOT NULL DEFAULT 'USD',
        "warranty_active_at_intake" boolean,
        "reported_at" timestamptz NOT NULL DEFAULT now(),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_repair_records_asset" ON "repair_records" ("asset_id", "reported_at" DESC)`,
    );
    await qr.query(
      `CREATE INDEX "ix_repair_records_status" ON "repair_records" ("status")`,
    );
    await qr.query(
      `CREATE INDEX "ix_repair_records_technician" ON "repair_records" ("technician_user_id")`,
    );

    await qr.query(`
      CREATE TABLE "repair_status_history" (
        "id" uuid PRIMARY KEY,
        "repair_id" uuid NOT NULL REFERENCES "repair_records"("id") ON DELETE CASCADE,
        "from_status" varchar(24),
        "to_status" varchar(24) NOT NULL,
        "changed_by_user_id" uuid NOT NULL,
        "note" text,
        "occurred_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_repair_history_repair" ON "repair_status_history" ("repair_id", "occurred_at")`,
    );

    // ---- Disposals ----
    await qr.query(`
      CREATE TABLE "disposal_records" (
        "id" uuid PRIMARY KEY,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
        "requested_by_user_id" uuid NOT NULL,
        "approved_by_user_id" uuid,
        "witness_user_id" uuid,
        "reason" varchar(32) NOT NULL,
        "method" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'Requested',
        "request_notes" text,
        "approval_notes" text,
        "rejection_reason" text,
        "signature_name" varchar(255),
        "signature_ip" varchar(64),
        "evidence_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "photo_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "disposal_date" date,
        "requested_at" timestamptz NOT NULL DEFAULT now(),
        "approved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_disposal_records_asset" ON "disposal_records" ("asset_id")`,
    );
    await qr.query(
      `CREATE INDEX "ix_disposal_records_status" ON "disposal_records" ("status")`,
    );
    // Only one non-terminal disposal per asset at a time.
    await qr.query(
      `CREATE UNIQUE INDEX "uq_disposal_active_per_asset" ON "disposal_records" ("asset_id") WHERE "status" = 'Requested'`,
    );

    // ---- Permissions ----
    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-000000000012', 'repair:read', 'Read repair records'),
        ('22222222-0000-0000-0000-000000000013', 'repair:manage', 'Create and update repair records'),
        ('22222222-0000-0000-0000-000000000014', 'disposal:read', 'Read disposal records'),
        ('22222222-0000-0000-0000-000000000015', 'disposal:request', 'Request an asset disposal'),
        ('22222222-0000-0000-0000-000000000016', 'disposal:approve', 'Approve or reject a disposal request')`,
    );
    const SA = '11111111-0000-0000-0000-000000000001';
    const ST = '11111111-0000-0000-0000-000000000002';
    const IT = '11111111-0000-0000-0000-000000000003';
    const PC = '11111111-0000-0000-0000-000000000004';
    const REPAIR_READ = '22222222-0000-0000-0000-000000000012';
    const REPAIR_MANAGE = '22222222-0000-0000-0000-000000000013';
    const DISPOSAL_READ = '22222222-0000-0000-0000-000000000014';
    const DISPOSAL_REQUEST = '22222222-0000-0000-0000-000000000015';
    const DISPOSAL_APPROVE = '22222222-0000-0000-0000-000000000016';
    const grants: Array<[string, string]> = [
      // SA gets everything
      [SA, REPAIR_READ], [SA, REPAIR_MANAGE],
      [SA, DISPOSAL_READ], [SA, DISPOSAL_REQUEST], [SA, DISPOSAL_APPROVE],
      // IT owns repairs
      [IT, REPAIR_READ], [IT, REPAIR_MANAGE], [IT, DISPOSAL_READ],
      // Stores can see and initiate disposals
      [ST, REPAIR_READ], [ST, DISPOSAL_READ], [ST, DISPOSAL_REQUEST],
      // P&C visibility only
      [PC, REPAIR_READ], [PC, DISPOSAL_READ],
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
      '22222222-0000-0000-0000-000000000012',
      '22222222-0000-0000-0000-000000000013',
      '22222222-0000-0000-0000-000000000014',
      '22222222-0000-0000-0000-000000000015',
      '22222222-0000-0000-0000-000000000016',
    ]) {
      await qr.query(`DELETE FROM "role_permissions" WHERE "permission_id" = $1`, [pid]);
      await qr.query(`DELETE FROM "permissions" WHERE "id" = $1`, [pid]);
    }
    await qr.query(`DROP TABLE IF EXISTS "disposal_records"`);
    await qr.query(`DROP TABLE IF EXISTS "repair_status_history"`);
    await qr.query(`DROP TABLE IF EXISTS "repair_records"`);
  }
}
