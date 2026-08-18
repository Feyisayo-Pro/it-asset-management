import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asset Return module schema + the seeded `asset-return` workflow
 * definition. The workflow rows ARE the business process — the
 * ReturnModule contains no hardcoded stage logic.
 */
export class AddAssetReturn1720500000000 implements MigrationInterface {
  name = 'AddAssetReturn1720500000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "return_records" (
        "id" uuid PRIMARY KEY,
        "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
        "holder_user_id" uuid,
        "initiated_by_user_id" uuid NOT NULL,
        "reason" varchar(32) NOT NULL,
        "reason_notes" text,
        "workflow_instance_id" uuid,
        "current_state" varchar(64) NOT NULL DEFAULT 'Initiated',
        "findings" text,
        "damage_notes" text,
        "missing_accessories" text,
        "outcome" varchar(32),
        "photo_urls" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_return_records_asset" ON "return_records" ("asset_id")`,
    );
    await qr.query(
      `CREATE INDEX "ix_return_records_state" ON "return_records" ("current_state")`,
    );

    await qr.query(`
      CREATE TABLE "return_items" (
        "id" uuid PRIMARY KEY,
        "return_record_id" uuid NOT NULL REFERENCES "return_records"("id") ON DELETE CASCADE,
        "item_type" varchar(32) NOT NULL,
        "description" varchar(255),
        "status" varchar(16) NOT NULL,
        "notes" text
      )
    `);
    await qr.query(
      `CREATE INDEX "ix_return_items_record" ON "return_items" ("return_record_id")`,
    );

    // ---- Seed the asset-return workflow definition (data, not code) ----
    const DEF = '33333333-0000-0000-0000-000000000001';
    await qr.query(
      `INSERT INTO "workflow_definitions"
        ("id","key","version","name","description","is_active","initial_state","final_states")
       VALUES ($1,'asset-return',1,'Asset Return',
        'Employee/P&C initiated return with IT assessment and three-party sign-off',
        true,'Initiated','["Completed","Cancelled"]'::jsonb)`,
      [DEF],
    );

    const stages: Array<[string, string, string, string[], number]> = [
      ['33333333-0000-0000-0001-000000000001', 'Initiated', 'Return initiated', ['IT_REP', 'STORES_OFFICER'], 0],
      ['33333333-0000-0000-0001-000000000002', 'Assessment', 'IT assessment', ['IT_REP'], 1],
      ['33333333-0000-0000-0001-000000000003', 'AwaitingEmployeeSignature', 'Employee sign-off', ['EMPLOYEE'], 2],
      ['33333333-0000-0000-0001-000000000004', 'AwaitingItSignature', 'IT sign-off', ['IT_REP'], 3],
      ['33333333-0000-0000-0001-000000000005', 'AwaitingPcSignature', 'P&C sign-off', ['PEOPLE_CULTURE'], 4],
      ['33333333-0000-0000-0001-000000000006', 'Completed', 'Completed', [], 5],
      ['33333333-0000-0000-0001-000000000007', 'Cancelled', 'Cancelled', [], 6],
    ];
    for (const [id, state, label, roles, sort] of stages) {
      await qr.query(
        `INSERT INTO "workflow_stages"
          ("id","definition_id","state","label","required_roles","sla_minutes","sort_order")
         VALUES ($1,$2,$3,$4,$5::jsonb,NULL,$6)`,
        [id, DEF, state, label, JSON.stringify(roles), sort],
      );
    }

    interface Tx {
      id: string; from: string; to: string; action: string; roles: string[];
      sig: boolean; evid: boolean; comment: boolean; notify: string[]; audit: string;
    }
    const txs: Tx[] = [
      {
        id: '33333333-0000-0000-0002-000000000001',
        from: 'Initiated', to: 'Assessment', action: 'record-items',
        roles: ['IT_REP', 'STORES_OFFICER', 'SUPER_ADMIN'],
        sig: false, evid: false, comment: false,
        notify: ['IT_REP'], audit: 'return.items-recorded',
      },
      {
        id: '33333333-0000-0000-0002-000000000002',
        from: 'Assessment', to: 'AwaitingEmployeeSignature', action: 'complete-assessment',
        roles: ['IT_REP', 'SUPER_ADMIN'],
        sig: false, evid: false, comment: true,
        notify: ['EMPLOYEE'], audit: 'return.assessed',
      },
      {
        id: '33333333-0000-0000-0002-000000000003',
        from: 'AwaitingEmployeeSignature', to: 'AwaitingItSignature', action: 'sign-employee',
        roles: ['EMPLOYEE', 'SUPER_ADMIN'],
        sig: true, evid: false, comment: false,
        notify: ['IT_REP'], audit: 'return.signed-employee',
      },
      {
        id: '33333333-0000-0000-0002-000000000004',
        from: 'AwaitingItSignature', to: 'AwaitingPcSignature', action: 'sign-it',
        roles: ['IT_REP', 'SUPER_ADMIN'],
        sig: true, evid: false, comment: false,
        notify: ['PEOPLE_CULTURE'], audit: 'return.signed-it',
      },
      {
        id: '33333333-0000-0000-0002-000000000005',
        from: 'AwaitingPcSignature', to: 'Completed', action: 'sign-pc',
        roles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'],
        sig: true, evid: false, comment: false,
        notify: ['EMPLOYEE', 'STORES_OFFICER'], audit: 'return.completed',
      },
      {
        id: '33333333-0000-0000-0002-000000000006',
        from: 'Initiated', to: 'Cancelled', action: 'cancel',
        roles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'],
        sig: false, evid: false, comment: true,
        notify: ['EMPLOYEE'], audit: 'return.cancelled',
      },
      {
        id: '33333333-0000-0000-0002-000000000007',
        from: 'Assessment', to: 'Cancelled', action: 'cancel',
        roles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'],
        sig: false, evid: false, comment: true,
        notify: ['EMPLOYEE'], audit: 'return.cancelled',
      },
    ];
    for (const t of txs) {
      await qr.query(
        `INSERT INTO "workflow_transitions_config"
          ("id","definition_id","from_state","to_state","action_name","required_roles",
           "requires_signature","requires_evidence","requires_comment",
           "notification_recipients","audit_action")
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11)`,
        [
          t.id, DEF, t.from, t.to, t.action, JSON.stringify(t.roles),
          t.sig, t.evid, t.comment, JSON.stringify(t.notify), t.audit,
        ],
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `DELETE FROM "workflow_definitions" WHERE "id" = '33333333-0000-0000-0000-000000000001'`,
    );
    await qr.query(`DROP TABLE IF EXISTS "return_items"`);
    await qr.query(`DROP TABLE IF EXISTS "return_records"`);
  }
}
