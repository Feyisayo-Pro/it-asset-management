import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Formalizes the `assets` table's unique indexes to match
 * `asset.orm-entity.ts` exactly (index names now line up 1:1 with the
 * entity's `@Index(...)` decorators — see AddAssetInventory1720300000000,
 * which is where these constraints actually originate):
 *   - uq_assets_asset_tag / uq_assets_serial_number already exist as
 *     named UNIQUE table constraints (Postgres backs each with a
 *     same-named unique index). Nothing to create here — this
 *     migration exists as the historical marker that the entity's
 *     index names were brought in line with them, closing a
 *     migration/entity naming drift that used to make
 *     `migration:generate` see a phantom diff.
 *   - uq_assets_imei_notnull (partial unique index on imei WHERE NOT
 *     NULL) already exists too, created by AddAssetInventory. It is
 *     re-asserted here with IF NOT EXISTS purely as a safety net for
 *     any database that, through drift, doesn't have it — NOT as a
 *     new object this migration owns.
 *
 * Because up() only conditionally creates something it doesn't
 * necessarily own, down() deliberately does NOT drop
 * uq_assets_imei_notnull: on every real environment that index was
 * created by AddAssetInventory1720300000000, which stays applied
 * when this migration alone is reverted. Dropping it here would
 * silently destroy the imei uniqueness guarantee out from under that
 * migration. Reverting AddAssetInventory (which does drop it, via its
 * `DROP TABLE`) is the correct way to remove it.
 */
export class RefactorAssetSchemaAndIndexes1721100000000
  implements MigrationInterface
{
  name = 'RefactorAssetSchemaAndIndexes1721100000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_assets_imei_notnull" ON "assets" ("imei") WHERE "imei" IS NOT NULL`,
    );
  }

  public async down(_qr: QueryRunner): Promise<void> {
    // Intentional no-op — see class doc comment above.
  }
}
