import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFINITION_ID = '33333333-0000-0000-0000-000000000002';

export class AddAllocationModule1721500000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE allocations (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id          UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        asset_id             UUID        REFERENCES assets(id) ON DELETE SET NULL,
        workflow_instance_id UUID        REFERENCES workflow_instances(id) ON DELETE SET NULL,
        current_state        VARCHAR(64) NOT NULL DEFAULT 'Requested',
        justification        TEXT,
        requested_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await runner.query(`CREATE INDEX idx_allocations_employee ON allocations(employee_id)`);
    await runner.query(`CREATE INDEX idx_allocations_asset ON allocations(asset_id)`);
    await runner.query(`CREATE INDEX idx_allocations_state ON allocations(current_state)`);

    await runner.query(`
      INSERT INTO workflow_definitions (id, key, version, name, description, is_active, initial_state, final_states, created_at, updated_at)
      VALUES (
        '${DEFINITION_ID}',
        'asset-allocation',
        1,
        'Asset Allocation',
        '8-stage allocation workflow: request through inventory update',
        true,
        'Requested',
        '["Completed","Rejected","Cancelled"]',
        now(), now()
      )
    `);

    const stages = [
      { state: 'Requested',          label: 'Requested',            roles: '[]',                      sla: null,  sort: 1 },
      { state: 'PcReview',           label: 'P&C Review',           roles: '["PEOPLE_CULTURE"]',      sla: 1440,  sort: 2 },
      { state: 'StoresSelect',       label: 'Stores Selection',     roles: '["STORES_OFFICER"]',      sla: 2880,  sort: 3 },
      { state: 'ItAssessment',       label: 'IT Assessment',        roles: '["IT_REP"]',              sla: 1440,  sort: 4 },
      { state: 'EmployeeSignature',  label: 'Employee Signature',   roles: '["EMPLOYEE"]',            sla: 4320,  sort: 5 },
      { state: 'PcSignature',        label: 'P&C Signature',        roles: '["PEOPLE_CULTURE"]',      sla: 1440,  sort: 6 },
      { state: 'ItSignature',        label: 'IT Signature',         roles: '["IT_REP"]',              sla: 1440,  sort: 7 },
      { state: 'InventoryUpdate',    label: 'Inventory Update',     roles: '["STORES_OFFICER"]',      sla: 480,   sort: 8 },
      { state: 'Completed',          label: 'Completed',            roles: '[]',                      sla: null,  sort: 9 },
      { state: 'Rejected',           label: 'Rejected',             roles: '[]',                      sla: null,  sort: 10 },
      { state: 'Cancelled',          label: 'Cancelled',            roles: '[]',                      sla: null,  sort: 11 },
    ];

    for (const s of stages) {
      const slaVal = s.sla !== null ? s.sla : 'NULL';
      await runner.query(`
        INSERT INTO workflow_stages (id, definition_id, state, label, required_roles, sla_minutes, sort_order)
        VALUES (gen_random_uuid(), '${DEFINITION_ID}', '${s.state}', '${s.label}', '${s.roles}'::jsonb, ${slaVal}, ${s.sort})
      `);
    }

    const transitions = [
      { from: 'Requested',         to: 'PcReview',          action: 'submit',          roles: '[]',                           sig: false, ev: false, cmt: false, audit: 'allocation.submitted' },
      { from: 'PcReview',          to: 'StoresSelect',      action: 'approve-pc',      roles: '["PEOPLE_CULTURE"]',           sig: false, ev: false, cmt: false, audit: 'allocation.pc-approved' },
      { from: 'PcReview',          to: 'Rejected',          action: 'reject-pc',       roles: '["PEOPLE_CULTURE"]',           sig: false, ev: false, cmt: true,  audit: 'allocation.pc-rejected' },
      { from: 'StoresSelect',      to: 'ItAssessment',      action: 'select-asset',    roles: '["STORES_OFFICER"]',           sig: false, ev: false, cmt: false, audit: 'allocation.asset-selected' },
      { from: 'ItAssessment',      to: 'EmployeeSignature', action: 'approve-it',      roles: '["IT_REP"]',                   sig: false, ev: false, cmt: false, audit: 'allocation.it-approved' },
      { from: 'ItAssessment',      to: 'Rejected',          action: 'reject-it',       roles: '["IT_REP"]',                   sig: false, ev: false, cmt: true,  audit: 'allocation.it-rejected' },
      { from: 'EmployeeSignature', to: 'PcSignature',       action: 'sign-employee',   roles: '["EMPLOYEE"]',                 sig: true,  ev: false, cmt: false, audit: 'allocation.employee-signed' },
      { from: 'PcSignature',       to: 'ItSignature',       action: 'sign-pc',         roles: '["PEOPLE_CULTURE"]',           sig: true,  ev: false, cmt: false, audit: 'allocation.pc-signed' },
      { from: 'ItSignature',       to: 'InventoryUpdate',   action: 'sign-it',         roles: '["IT_REP"]',                   sig: true,  ev: false, cmt: false, audit: 'allocation.it-signed' },
      { from: 'InventoryUpdate',   to: 'Completed',         action: 'confirm-update',  roles: '["STORES_OFFICER"]',           sig: false, ev: false, cmt: false, audit: 'allocation.completed' },
      { from: 'Requested',         to: 'Cancelled',         action: 'cancel',          roles: '[]',                           sig: false, ev: false, cmt: false, audit: 'allocation.cancelled' },
      { from: 'PcReview',          to: 'Cancelled',         action: 'cancel',          roles: '["SUPER_ADMIN"]',              sig: false, ev: false, cmt: true,  audit: 'allocation.cancelled' },
    ];

    for (const t of transitions) {
      await runner.query(`
        INSERT INTO workflow_transitions_config
          (id, definition_id, from_state, to_state, action_name, required_roles, requires_signature, requires_evidence, requires_comment, notification_recipients, audit_action)
        VALUES
          (gen_random_uuid(), '${DEFINITION_ID}', '${t.from}', '${t.to}', '${t.action}', '${t.roles}'::jsonb, ${t.sig}, ${t.ev}, ${t.cmt}, '[]'::jsonb, '${t.audit}')
      `);
    }

    await runner.query(`
      INSERT INTO permissions (id, name, description, created_at, updated_at)
      VALUES
        ('22222222-0000-0000-0000-000000000027', 'allocation:read',   'View allocations',          now(), now()),
        ('22222222-0000-0000-0000-000000000028', 'allocation:manage', 'Create and manage allocations', now(), now())
      ON CONFLICT (id) DO NOTHING
    `);

    await runner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000027'),
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000028'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000027'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000028'),
        ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000027'),
        ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000028'),
        ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000027'),
        ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000028'),
        ('11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000027')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        '22222222-0000-0000-0000-000000000027',
        '22222222-0000-0000-0000-000000000028'
      )
    `);
    await runner.query(`
      DELETE FROM permissions
      WHERE id IN (
        '22222222-0000-0000-0000-000000000027',
        '22222222-0000-0000-0000-000000000028'
      )
    `);
    await runner.query(`DELETE FROM workflow_instance_transitions WHERE instance_id IN (SELECT id FROM workflow_instances WHERE definition_id = '${DEFINITION_ID}')`);
    await runner.query(`DELETE FROM workflow_instances WHERE definition_id = '${DEFINITION_ID}'`);
    await runner.query(`DELETE FROM workflow_transitions_config WHERE definition_id = '${DEFINITION_ID}'`);
    await runner.query(`DELETE FROM workflow_stages WHERE definition_id = '${DEFINITION_ID}'`);
    await runner.query(`DELETE FROM workflow_definitions WHERE id = '${DEFINITION_ID}'`);
    await runner.query(`DROP TABLE IF EXISTS allocations`);
  }
}
