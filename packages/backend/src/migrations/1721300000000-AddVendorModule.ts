import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorModule1721300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vendors" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"           varchar(255) NOT NULL,
        "contact_person" varchar(255),
        "email"          varchar(255),
        "phone"          varchar(50),
        "tax_id"         varchar(100),
        "address"        text,
        "website"        varchar(255),
        "notes"          text,
        "is_active"      boolean NOT NULL DEFAULT true,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_vendors_name" UNIQUE ("name")
      );
    `);

    await queryRunner.query(`CREATE INDEX "ix_vendors_active" ON "vendors" ("is_active")`);

    // vendor:read (23) and vendor:manage (24) permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "key", "description") VALUES
        ('22222222-0000-0000-0000-000000000023', 'vendor:read', 'View vendor records'),
        ('22222222-0000-0000-0000-000000000024', 'vendor:manage', 'Create, update, delete vendors')
    `);

    // SA, ST, IT get read; SA, ST get manage
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000023'),
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000024'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000023'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000024'),
        ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000023')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN ('22222222-0000-0000-0000-000000000023', '22222222-0000-0000-0000-000000000024')`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "id" IN ('22222222-0000-0000-0000-000000000023', '22222222-0000-0000-0000-000000000024')`);
    await queryRunner.query(`DROP TABLE "vendors"`);
  }
}
