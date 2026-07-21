import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMasterData1721200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['departments', 'offices', 'device_types', 'brands']) {
      await queryRunner.query(`
        CREATE TABLE "master_data_${table}" (
          "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "name"       varchar(128) NOT NULL,
          "is_active"  boolean NOT NULL DEFAULT true,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "uq_md_${table}_name" UNIQUE ("name")
        );
      `);
      await queryRunner.query(
        `CREATE INDEX "ix_md_${table}_active" ON "master_data_${table}" ("is_active")`,
      );
    }

    // Add master-data:manage permission (id 22)
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "key", "description")
      VALUES ('22222222-0000-0000-0000-000000000022', 'master-data:manage', 'Manage master data reference tables')
    `);

    // Assign to Super Admin
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000022')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" = '22222222-0000-0000-0000-000000000022'`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "id" = '22222222-0000-0000-0000-000000000022'`);
    for (const table of ['brands', 'device_types', 'offices', 'departments']) {
      await queryRunner.query(`DROP TABLE "master_data_${table}"`);
    }
  }
}
