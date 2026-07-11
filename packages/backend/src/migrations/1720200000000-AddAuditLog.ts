import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only audit_logs table. Update/delete blocked at the app layer
 * (AuditLogRepository exposes only append). Production hardening would
 * additionally grant an INSERT+SELECT-only DB role — deferred.
 */
export class AddAuditLog1720200000000 implements MigrationInterface {
  name = 'AddAuditLog1720200000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid,
        "action" varchar(128) NOT NULL,
        "entity_type" varchar(64) NOT NULL,
        "entity_id" varchar(64),
        "old_value" jsonb,
        "new_value" jsonb,
        "ip" varchar(64),
        "user_agent" varchar(256),
        "correlation_id" varchar(64),
        "occurred_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`CREATE INDEX "ix_audit_logs_user_id" ON "audit_logs" ("user_id")`);
    await qr.query(
      `CREATE INDEX "ix_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`,
    );
    await qr.query(
      `CREATE INDEX "ix_audit_logs_occurred_at" ON "audit_logs" ("occurred_at" DESC)`,
    );

    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-00000000000b', 'audit:read', 'Read audit logs')`,
    );
    await qr.query(
      `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-00000000000b')
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" = '22222222-0000-0000-0000-00000000000b'`,
    );
    await qr.query(
      `DELETE FROM "permissions" WHERE "id" = '22222222-0000-0000-0000-00000000000b'`,
    );
    await qr.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
