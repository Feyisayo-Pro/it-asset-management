import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardPermission1720900000000 implements MigrationInterface {
  name = 'AddDashboardPermission1720900000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `INSERT INTO "permissions" ("id","key","description") VALUES
        ('22222222-0000-0000-0000-000000000021', 'dashboard:read', 'View enterprise dashboard')`,
    );

    const SA = '11111111-0000-0000-0000-000000000001';
    const ST = '11111111-0000-0000-0000-000000000002';
    const IT = '11111111-0000-0000-0000-000000000003';
    const PC = '11111111-0000-0000-0000-000000000004';
    const EMP = '11111111-0000-0000-0000-000000000005';
    const DASH = '22222222-0000-0000-0000-000000000021';

    for (const role of [SA, ST, IT, PC, EMP]) {
      await qr.query(
        `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES ($1, $2)`,
        [role, DASH],
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const DASH = '22222222-0000-0000-0000-000000000021';
    await qr.query(`DELETE FROM "role_permissions" WHERE "permission_id" = $1`, [DASH]);
    await qr.query(`DELETE FROM "permissions" WHERE "id" = $1`, [DASH]);
  }
}
