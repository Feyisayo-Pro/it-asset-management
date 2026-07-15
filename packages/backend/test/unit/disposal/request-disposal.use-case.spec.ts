import { RequestDisposalUseCase } from '../../../src/modules/disposal/application/use-cases/request-disposal.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import { AssetNotFoundError } from '../../../src/common/errors/asset.errors';
import {
  ActiveDisposalExistsError,
  AssetAlreadyDisposedError,
} from '../../../src/common/errors/disposal.errors';
import { FakeAssetRepository } from '../asset/fakes';
import { FakeDisposalRepository } from './fakes';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
} from '../fakes/fakes';

const now = new Date('2026-07-11T00:00:00Z');

const build = () => {
  const disposals = new FakeDisposalRepository();
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(now);
  const events = new FakeEventPublisher();
  const useCase = new RequestDisposalUseCase(
    disposals,
    assets,
    ids,
    clock,
    events as unknown as never,
  );
  return { useCase, disposals, assets, events };
};

const seedAsset = async (
  ctx: ReturnType<typeof build>,
  status: AssetStatus = AssetStatus.UnderRepair,
) => {
  const asset = Asset.register({
    id: 'a1',
    assetTag: 'AST-2026-00001',
    deviceType: 'Laptop',
    brand: 'Acme',
    model: 'X1',
    serialNumber: 'SN1',
    now,
  });
  asset.changeStatus(AssetStatus.Available, now);
  if (status === AssetStatus.UnderRepair) {
    asset.changeStatus(AssetStatus.UnderRepair, now);
  } else if (status === AssetStatus.Disposed) {
    asset.changeStatus(AssetStatus.Disposed, now);
  }
  await ctx.assets.save(asset);
  return asset;
};

describe('RequestDisposalUseCase', () => {
  it('creates a Requested disposal and emits disposal.requested', async () => {
    const ctx = build();
    await seedAsset(ctx);
    const record = await ctx.useCase.execute({
      assetId: 'a1',
      requestedByUserId: 'it-1',
      reason: 'BeyondRepair',
      method: 'EWasteRecycling',
      photoUrls: ['https://cdn/img/1.jpg'],
    });
    expect(record.status).toBe('Requested');
    expect(record.reason).toBe('BeyondRepair');
    expect(ctx.events.namesOf()).toEqual(['disposal.requested']);
  });

  it('rejects a disposal for an already-disposed asset', async () => {
    const ctx = build();
    await seedAsset(ctx, AssetStatus.Disposed);
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        requestedByUserId: 'it-1',
        reason: 'Obsolete',
        method: 'Destroyed',
        photoUrls: ['https://cdn/img/x.jpg'],
      }),
    ).rejects.toBeInstanceOf(AssetAlreadyDisposedError);
  });

  it('rejects a second active disposal for the same asset', async () => {
    const ctx = build();
    await seedAsset(ctx);
    await ctx.useCase.execute({
      assetId: 'a1',
      requestedByUserId: 'it-1',
      reason: 'BeyondRepair',
      method: 'EWasteRecycling',
      photoUrls: ['https://cdn/img/1.jpg'],
    });
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        requestedByUserId: 'it-2',
        reason: 'Damaged',
        method: 'Destroyed',
        photoUrls: ['https://cdn/img/2.jpg'],
      }),
    ).rejects.toBeInstanceOf(ActiveDisposalExistsError);
  });

  it('rejects an unknown asset', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        assetId: '00000000-0000-0000-0000-000000000000',
        requestedByUserId: 'it-1',
        reason: 'Lost',
        method: 'Other',
        photoUrls: ['https://cdn/img/x.jpg'],
      }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });
});
