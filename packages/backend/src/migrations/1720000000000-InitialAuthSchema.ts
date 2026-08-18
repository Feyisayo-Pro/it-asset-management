import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the auth + rbac tables and seeds the fixed roles and the
 * starter permission set with SUPER_ADMIN wired to everything.
 * All seeded IDs are deterministic so re-running seeds is a no-op.
 */
export class InitialAuthSchema1720000000000 implements MigrationInterface {
  name = 'InitialAuthSchema1720000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await qr.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY,
        "name" varchar(64) NOT NULL,
        "description" varchar(255) NOT NULL,
        CONSTRAINT "uq_roles_name" UNIQUE ("name")
      )
    `);

    await qr.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY,
        "key" varchar(128) NOT NULL,
        "description" varchar(255) NOT NULL,
        CONSTRAINT "uq_permissions_key" UNIQUE ("key")
      )
    `);

    await qr.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        PRIMARY KEY ("role_id", "permission_id")
      )
    `);

    await qr.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
        "is_active" boolean NOT NULL DEFAULT true,
        "failed_login_attempts" int NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "last_login_at" timestamptz,
        "must_change_password" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);
    await qr.query(`CREATE INDEX "ix_users_role_id" ON "users" ("role_id")`);

    await qr.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz,
        "replaced_by_id" uuid,
        CONSTRAINT "uq_refresh_tokens_hash" UNIQUE ("token_hash")
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );

    await qr.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "used_at" timestamptz,
        CONSTRAINT "uq_reset_tokens_hash" UNIQUE ("token_hash")
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_reset_tokens_user_id" ON "password_reset_tokens" ("user_id")`,
    );

    // Seed roles
    const roleRows = [
      [
        '11111111-0000-0000-0000-000000000001',
        'SUPER_ADMIN',
        'Full system access',
      ],
      [
        '11111111-0000-0000-0000-000000000002',
        'STORES_OFFICER',
        'Manages inventory and asset registration',
      ],
      [
        '11111111-0000-0000-0000-000000000003',
        'IT_REP',
        'Performs assessments and repair handling',
      ],
      [
        '11111111-0000-0000-0000-000000000004',
        'PEOPLE_CULTURE',
        'Owns allocation and return workflows',
      ],
      [
        '11111111-0000-0000-0000-000000000005',
        'EMPLOYEE',
        'Requests devices and signs allocations',
      ],
    ];
    for (const [id, name, desc] of roleRows) {
      await qr.query(
        `INSERT INTO "roles" ("id","name","description") VALUES ($1,$2,$3)`,
        [id, name, desc],
      );
    }

    // Seed permissions
    const permRows = [
      ['22222222-0000-0000-0000-000000000001', 'auth:manage-own-password', 'Change own password'],
      ['22222222-0000-0000-0000-000000000002', 'user:manage', 'Manage users (create/edit/deactivate)'],
      ['22222222-0000-0000-0000-000000000003', 'employee:read', 'Read employee records'],
      ['22222222-0000-0000-0000-000000000004', 'employee:manage', 'Manage employee records'],
      ['22222222-0000-0000-0000-000000000005', 'employee:manage-status', 'Change employment status'],
      ['22222222-0000-0000-0000-000000000006', 'asset:read', 'Read all assets'],
      ['22222222-0000-0000-0000-000000000007', 'asset:read-own', 'Read own assigned assets'],
      ['22222222-0000-0000-0000-000000000008', 'asset:manage', 'Manage assets'],
      ['22222222-0000-0000-0000-000000000009', 'asset:direct-status', 'Direct status change (bypass)'],
      ['22222222-0000-0000-0000-00000000000a', 'rbac:read', 'Read RBAC roles/permissions'],
    ];
    for (const [id, key, desc] of permRows) {
      await qr.query(
        `INSERT INTO "permissions" ("id","key","description") VALUES ($1,$2,$3)`,
        [id, key, desc],
      );
    }

    const rolePermRows: Array<[string, string]> = [];

    const SUPER_ADMIN = roleRows[0][0];
    // SUPER_ADMIN → every permission
    for (const [pid] of permRows) rolePermRows.push([SUPER_ADMIN, pid]);

    const STORES = roleRows[1][0];
    const IT_REP = roleRows[2][0];
    const PC = roleRows[3][0];
    const EMPLOYEE = roleRows[4][0];

    // Every role can change its own password.
    const P_MANAGE_OWN_PWD = permRows[0][0];
    for (const rid of [STORES, IT_REP, PC, EMPLOYEE]) {
      rolePermRows.push([rid, P_MANAGE_OWN_PWD]);
    }

    // Stores: read employees, manage assets, direct status excluded.
    const P_EMPLOYEE_READ = permRows[2][0];
    const P_ASSET_READ = permRows[5][0];
    const P_ASSET_MANAGE = permRows[7][0];
    rolePermRows.push([STORES, P_EMPLOYEE_READ]);
    rolePermRows.push([STORES, P_ASSET_READ]);
    rolePermRows.push([STORES, P_ASSET_MANAGE]);

    // IT rep: read employees + read assets.
    rolePermRows.push([IT_REP, P_EMPLOYEE_READ]);
    rolePermRows.push([IT_REP, P_ASSET_READ]);

    // People & Culture: manage employees + read assets.
    const P_EMPLOYEE_MANAGE = permRows[3][0];
    const P_EMPLOYEE_STATUS = permRows[4][0];
    rolePermRows.push([PC, P_EMPLOYEE_READ]);
    rolePermRows.push([PC, P_EMPLOYEE_MANAGE]);
    rolePermRows.push([PC, P_EMPLOYEE_STATUS]);
    rolePermRows.push([PC, P_ASSET_READ]);

    // Employee: own-asset visibility only.
    const P_ASSET_READ_OWN = permRows[6][0];
    rolePermRows.push([EMPLOYEE, P_ASSET_READ_OWN]);

    for (const [rid, pid] of rolePermRows) {
      await qr.query(
        `INSERT INTO "role_permissions" ("role_id","permission_id") VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [rid, pid],
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS "password_reset_tokens"');
    await qr.query('DROP TABLE IF EXISTS "refresh_tokens"');
    await qr.query('DROP TABLE IF EXISTS "users"');
    await qr.query('DROP TABLE IF EXISTS "role_permissions"');
    await qr.query('DROP TABLE IF EXISTS "permissions"');
    await qr.query('DROP TABLE IF EXISTS "roles"');
  }
}
