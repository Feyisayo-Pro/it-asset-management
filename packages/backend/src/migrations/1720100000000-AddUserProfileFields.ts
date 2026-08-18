import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds firstName / lastName columns required by User Management
 * (UI §29–30). Any pre-existing users (e.g. the bootstrap admin) are
 * backfilled with a safe placeholder so the NOT NULL promotion cannot
 * fail on an already-populated DB.
 */
export class AddUserProfileFields1720100000000 implements MigrationInterface {
  name = 'AddUserProfileFields1720100000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "users" ADD COLUMN "first_name" varchar(100)`,
    );
    await qr.query(
      `ALTER TABLE "users" ADD COLUMN "last_name" varchar(100)`,
    );
    await qr.query(
      `UPDATE "users" SET "first_name" = 'System', "last_name" = 'Administrator' WHERE "first_name" IS NULL`,
    );
    await qr.query(
      `ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL`,
    );
    // Support case-insensitive email uniqueness + sort by last_name.
    await qr.query(
      `CREATE INDEX "ix_users_last_name" ON "users" ("last_name")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "ix_users_last_name"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name"`);
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name"`);
  }
}
