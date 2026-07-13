import { ChangeAssetStatusUseCase } from '../../../src/modules/asset/application/use-cases/change-asset-status.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import { AssetNotFoundError, InvalidAssetStatusTransitionError } from '../../../src/common/errors/asset.errors';
import { FakeClock, FakeEventPublisher, FakeIdGenerator } from '../fakes/fakes';
import { FakeAssetRepository } from './fakes';

const build = () => {
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const events = new FakeEventPublisher();
  return {
    useCase: new ChangeAssetStatusUseCase(assets, ids, clock, events as unknown as never),
    assets,
    events,
  };
};

const seed = async (ctx: ReturnType<typeof build>, status: AssetStatus = AssetStatus.Available) => {
  const asset = Asset.register({
    id: 'a1',
    assetTag: 'AST-2026-00001',
    deviceType: 'Laptop',
    brand: 'A',
    model: 'B',
    serialNumber: 'SN1',
  });
  if (status !== AssetStatus.Registration) asset.changeStatus(status, new Date());
  await ctx.assets.save(asset);
  return asset;
};

describe('ChangeAssetStatusUseCase', () => {
  it('changes status, records history, emits event', async () => {
    const ctx = build();
    await seed(ctx);
    await ctx.useCase.execute({
      assetId: 'a1',
      toStatus: AssetStatus.Allocated,
      reason: 'Assigned to Ada',
      newHolderId: 'emp-1',
    });
    const updated = await ctx.assets.findById('a1');
    expect(updated?.status).toBe(AssetStatus.Allocated);
    expect(updated?.currentHolderId).toBe('emp-1');
    expect(ctx.assets.history[0].toStatus).toBe(AssetStatus.Allocated);
    expect(ctx.events.namesOf()).toContain('asset.status-changed');
  });

  it('rejects unknown asset', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        assetId: 'ghost',
        toStatus: AssetStatus.Available,
        reason: 'x',
      }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });

  it('rejects illegal transitions', async () => {
    const ctx = build();
    await seed(ctx, AssetStatus.Available);
    await ctx.useCase.execute({
      assetId: 'a1',
      toStatus: AssetStatus.Disposed,
      reason: 'gone',
    });
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        toStatus: AssetStatus.Available,
        reason: 'brought back',
      }),
    ).rejects.toBeInstanceOf(InvalidAssetStatusTransitionError);
  });
});
