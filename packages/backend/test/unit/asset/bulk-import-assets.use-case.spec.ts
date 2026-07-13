import { BulkImportAssetsUseCase } from '../../../src/modules/asset/application/use-cases/bulk-import-assets.use-case';
import { FakeClock, FakeEventPublisher, FakeIdGenerator } from '../fakes/fakes';
import { FakeAssetRepository } from './fakes';

const build = () => {
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const events = new FakeEventPublisher();
  return {
    useCase: new BulkImportAssetsUseCase(assets, ids, clock, events as unknown as never),
    assets,
    events,
  };
};

describe('BulkImportAssetsUseCase', () => {
  const csv = [
    'asset_tag,device_type,brand,model,serial_number,imei,purchase_amount,purchase_currency',
    ',Laptop,Acme,X1,SN1,,1200,USD',
    'AST-CUSTOM-01,Laptop,Acme,X1,SN2,,,',
    ',Phone,Nokia,3310,SN3,111,,,',
    ',Laptop,Acme,X1,SN1,,,', // duplicate SN
    ',Laptop,,X1,SN4,,,', // missing brand
  ].join('\n');

  it('dry-run reports success + errors without writing', async () => {
    const ctx = build();
    const result = await ctx.useCase.execute({ csv, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.totalRows).toBe(5);
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(2);
    expect(ctx.assets.assets.size).toBe(0);
  });

  it('commit writes only the valid rows', async () => {
    const ctx = build();
    const result = await ctx.useCase.execute({ csv, dryRun: false });
    expect(result.successCount).toBe(3);
    expect(ctx.assets.assets.size).toBe(3);
    expect(ctx.events.namesOf()).toContain('asset.bulk-imported');
  });

  it('detects in-file duplicates as well as pre-existing duplicates', async () => {
    const ctx = build();
    await ctx.useCase.execute({ csv, dryRun: false });
    const rerun = await ctx.useCase.execute({ csv, dryRun: false });
    // now all previously-good rows collide
    expect(rerun.successCount).toBe(0);
    expect(rerun.errorCount).toBe(5);
  });
});
