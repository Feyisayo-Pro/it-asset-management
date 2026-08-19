import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a display-only "assigned employee name" column to assets —
 * distinct from current_holder_id (a FK to the users table): most
 * employees holding a device in the real inventory are not IAM
 * system users, so this is free text captured from the source
 * inventory's "NEWLY ASSIGNED" column, not an account reference.
 */
export class AddAssetAssignedEmployeeName1721300000000
  implements MigrationInterface
{
  name = 'AddAssetAssignedEmployeeName1721300000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "assets" ADD COLUMN "assigned_employee_name" varchar(128)`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "assets" DROP COLUMN "assigned_employee_name"`,
    );
  }
}
