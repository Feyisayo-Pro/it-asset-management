import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcquisitionModule1721400000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE acquisitions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id       UUID        REFERENCES vendors(id) ON DELETE SET NULL,
        invoice_number  VARCHAR(128),
        purchase_date   DATE,
        warranty_months INT,
        unit_cost_cents BIGINT,
        currency        CHAR(3)     NOT NULL DEFAULT 'USD',
        quantity        INT         NOT NULL DEFAULT 1,
        notes           TEXT,
        created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await runner.query(`CREATE INDEX idx_acquisitions_vendor ON acquisitions(vendor_id)`);
    await runner.query(`CREATE INDEX idx_acquisitions_purchase_date ON acquisitions(purchase_date)`);
    await runner.query(`CREATE INDEX idx_acquisitions_invoice ON acquisitions(invoice_number)`);

    await runner.query(`
      CREATE TABLE acquisition_assets (
        acquisition_id UUID NOT NULL REFERENCES acquisitions(id) ON DELETE CASCADE,
        asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        PRIMARY KEY (acquisition_id, asset_id)
      );
    `);

    await runner.query(`CREATE INDEX idx_acquisition_assets_asset ON acquisition_assets(asset_id)`);

    await runner.query(`
      INSERT INTO permissions (id, name, description, created_at, updated_at)
      VALUES
        ('22222222-0000-0000-0000-000000000025', 'acquisition:read',   'View acquisitions',                now(), now()),
        ('22222222-0000-0000-0000-000000000026', 'acquisition:manage', 'Create/update/delete acquisitions', now(), now())
      ON CONFLICT (id) DO NOTHING
    `);

    await runner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000025'),
        ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000026'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000025'),
        ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000026'),
        ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000025')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        '22222222-0000-0000-0000-000000000025',
        '22222222-0000-0000-0000-000000000026'
      )
    `);
    await runner.query(`
      DELETE FROM permissions
      WHERE id IN (
        '22222222-0000-0000-0000-000000000025',
        '22222222-0000-0000-0000-000000000026'
      )
    `);
    await runner.query(`DROP TABLE IF EXISTS acquisition_assets`);
    await runner.query(`DROP TABLE IF EXISTS acquisitions`);
  }
}
