import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplianceModule1721600000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE compliance_breaches (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_instance_id UUID        NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        definition_key       VARCHAR(64) NOT NULL,
        subject_type         VARCHAR(64) NOT NULL,
        subject_id           VARCHAR(64) NOT NULL,
        breached_state       VARCHAR(64) NOT NULL,
        sla_minutes          INT         NOT NULL,
        entered_at           TIMESTAMPTZ NOT NULL,
        breached_at          TIMESTAMPTZ NOT NULL,
        resolved_at          TIMESTAMPTZ,
        escalation_sent      BOOLEAN     NOT NULL DEFAULT false,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await runner.query(`CREATE INDEX idx_compliance_breaches_instance ON compliance_breaches(workflow_instance_id)`);
    await runner.query(`CREATE INDEX idx_compliance_breaches_definition ON compliance_breaches(definition_key)`);
    await runner.query(`CREATE INDEX idx_compliance_breaches_unresolved ON compliance_breaches(resolved_at) WHERE resolved_at IS NULL`);

    await runner.query(`
      INSERT INTO "permissions" ("id", "key", "description")
      VALUES
        ('22222222-0000-0000-0000-000000000029', 'compliance:read',   'View compliance breaches'),
        ('22222222-0000-0000-0000-000000000030', 'compliance:manage', 'Manage compliance settings')
      ON CONFLICT (id) DO NOTHING
    `);

    await runner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000029'),
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000030'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000029'),
        ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000029'),
        ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000029')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        '22222222-0000-0000-0000-000000000029',
        '22222222-0000-0000-0000-000000000030'
      )
    `);
    await runner.query(`
      DELETE FROM permissions
      WHERE id IN (
        '22222222-0000-0000-0000-000000000029',
        '22222222-0000-0000-0000-000000000030'
      )
    `);
    await runner.query(`DROP TABLE IF EXISTS compliance_breaches`);
  }
}
