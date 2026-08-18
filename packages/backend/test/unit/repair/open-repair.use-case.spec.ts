import { OpenRepairUseCase } from '../../../src/modules/repair/application/use-cases/open-repair.use-case';
import { ChangeAssetStatusUseCase } from '../../../src/modules/asset/application/use-cases/change-asset-status.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import { ActiveRepairExistsError } from '../../../src/common/errors/repair.errors';
import { AssetNotFoundError } from '../../../src/common/errors/asset.errors';
import { FakeAssetRepository } from '../asset/fakes';
import { FakeRepairRepository } from './fakes';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
} from '../fakes/fakes';

const now = new Date('2026-07-11T00:00:00Z');

const build = () => {
  const repairs = new FakeRepairRepository();
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(now);
  const events = new FakeEventPublisher();
  const changeAssetStatus = new ChangeAssetStatusUseCase(
    assets,
    ids,
    clock,
    events as unknown as never,
  );
  const useCase = new OpenRepairUseCase(
    repairs,
    assets,
    ids,
    clock,
    changeAssetStatus,
    events as unknown as never,
  );
  return { useCase, repairs, assets, events, changeAssetStatus, ids };
};

const seedAllocatedAsset = async (ctx: ReturnType<typeof build>) => {
  const asset = Asset.register({
    id: 'a1',
    assetTag: 'AST-2026-00001',
    deviceType: 'Laptop',
    brand: 'Acme',
    model: 'X1',
    serialNumber: 'SN1',
    purchaseDate: new Date('2025-01-01'),
    warrantyExpiry: new Date('2027-01-01'),
    now,
  });
  asset.changeStatus(AssetStatus.Available, now);
  asset.changeStatus(AssetStatus.Allocated, now, 'emp-1');
  await ctx.assets.save(asset);
  return asset;
};

describe('OpenRepairUseCase', () => {
  it('creates a Pending repair, flips the asset to UnderRepair, seeds history, emits repair.opened', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx);

    const record = await ctx.useCase.execute({
      assetId: 'a1',
      reportedFault: 'Screen won\'t turn on',
      createdByUserId: 'it-1',
    });

    expect(record.status).toBe('Pending');
    expect(record.warrantyActiveAtIntake).toBe(true);
    expect(record.employeeUserId).toBe('emp-1');
    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.UnderRepair);
    expect(ctx.repairs.history).toHaveLength(1);
    expect(ctx.repairs.history[0]!.toStatus).toBe('Pending');
    expect(ctx.events.namesOf()).toContain('repair.opened');
    expect(ctx.events.namesOf()).toContain('asset.status-changed');
  });

  it('reports warrantyActiveAtIntake=false when warranty has lapsed', async () => {
    const ctx = build();
    const asset = Asset.register({
      id: 'a1',
      assetTag: 'AST-2026-00002',
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN2',
      purchaseDate: new Date('2020-01-01'),
      warrantyExpiry: new Date('2022-01-01'),
      now,
    });
    asset.changeStatus(AssetStatus.Available, now);
    await ctx.assets.save(asset);
    const record = await ctx.useCase.execute({
      assetId: 'a1',
      reportedFault: 'Dead battery',
      createdByUserId: 'it-1',
    });
    expect(record.warrantyActiveAtIntake).toBe(false);
  });

  it('rejects opening a second repair for the same asset', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx);
    await ctx.useCase.execute({
      assetId: 'a1',
      reportedFault: 'Won\'t boot',
      createdByUserId: 'it-1',
    });
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        reportedFault: 'Won\'t boot again',
        createdByUserId: 'it-1',
      }),
    ).rejects.toBeInstanceOf(ActiveRepairExistsError);
  });

  it('rejects an unknown asset', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        assetId: '00000000-0000-0000-0000-000000000000',
        reportedFault: 'Anything',
        createdByUserId: 'it-1',
      }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });
});
