import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsAndReporting1720800000000 implements MigrationInterface {
  name = 'AddNotificationsAndReporting1720800000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY,
        "recipient_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "channel" varchar(16) NOT NULL DEFAULT 'IN_APP',
        "event_type" varchar(32) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_notifications_recipient" ON "notifications" ("recipient_user_id", "created_at" DESC)`,
    );
    await qr.query(
      `CREATE INDEX "ix_notifications_unread" ON "notifications" ("recipient_user_id") WHERE "read" = false`,
    );
    await qr.query(
      `CREATE INDEX "ix_notifications_event_type" ON "notifications" ("event_type")`,
    );

    // ---- Permissions ----
    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-000000000017', 'notification:read', 'View own notifications'),
        ('22222222-0000-0000-0000-000000000018', 'notification:manage', 'Manage notification settings'),
        ('22222222-0000-0000-0000-000000000019', 'report:read', 'View reports and analytics'),
        ('22222222-0000-0000-0000-000000000020', 'report:export', 'Export reports to PDF/Excel/CSV')`,
    );

    const SA = '11111111-0000-0000-0000-000000000001';
    const ST = '11111111-0000-0000-0000-000000000002';
    const IT = '11111111-0000-0000-0000-000000000003';
    const PC = '11111111-0000-0000-0000-000000000004';
    const EMP = '11111111-0000-0000-0000-000000000005';

    const NOTIF_READ = '22222222-0000-0000-0000-000000000017';
    const NOTIF_MANAGE = '22222222-0000-0000-0000-000000000018';
    const REPORT_READ = '22222222-0000-0000-0000-000000000019';
    const REPORT_EXPORT = '22222222-0000-0000-0000-000000000020';

    const grants: Array<[string, string]> = [
      // Everyone reads own notifications
      [SA, NOTIF_READ], [ST, NOTIF_READ], [IT, NOTIF_READ], [PC, NOTIF_READ], [EMP, NOTIF_READ],
      // SA manages notifications
      [SA, NOTIF_MANAGE],
      // Reports for non-Employee roles
      [SA, REPORT_READ], [SA, REPORT_EXPORT],
      [ST, REPORT_READ], [ST, REPORT_EXPORT],
      [IT, REPORT_READ], [IT, REPORT_EXPORT],
      [PC, REPORT_READ], [PC, REPORT_EXPORT],
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
      '22222222-0000-0000-0000-000000000017',
      '22222222-0000-0000-0000-000000000018',
      '22222222-0000-0000-0000-000000000019',
      '22222222-0000-0000-0000-000000000020',
    ]) {
      await qr.query(`DELETE FROM "role_permissions" WHERE "permission_id" = $1`, [pid]);
      await qr.query(`DELETE FROM "permissions" WHERE "id" = $1`, [pid]);
    }
    await qr.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
