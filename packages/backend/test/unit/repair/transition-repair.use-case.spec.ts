import { OpenRepairUseCase } from '../../../src/modules/repair/application/use-cases/open-repair.use-case';
import { TransitionRepairUseCase } from '../../../src/modules/repair/application/use-cases/transition-repair.use-case';
import { RepairCompletedHandler } from '../../../src/modules/repair/application/handlers/repair-completed.handler';
import { ChangeAssetStatusUseCase } from '../../../src/modules/asset/application/use-cases/change-asset-status.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import { RepairCompletedEvent } from '../../../src/modules/repair/domain/events/repair.events';
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
  const open = new OpenRepairUseCase(
    repairs,
    assets,
    ids,
    clock,
    changeAssetStatus,
    events as unknown as never,
  );
  const transition = new TransitionRepairUseCase(
    repairs,
    ids,
    clock,
    events as unknown as never,
  );
  const handler = new RepairCompletedHandler(changeAssetStatus);
  return { open, transition, handler, repairs, assets, events, changeAssetStatus };
};

const seed = async (ctx: ReturnType<typeof build>) => {
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
  await ctx.assets.save(asset);
  return ctx.open.execute({
    assetId: 'a1',
    reportedFault: 'Boot loop',
    createdByUserId: 'it-1',
  });
};

describe('TransitionRepairUseCase + RepairCompletedHandler', () => {
  it('walks Pending → Diagnosing → InProgress → Completed and appends history each step', async () => {
    const ctx = build();
    const opened = await seed(ctx);
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'Diagnosing',
      changedByUserId: 'it-1',
    });
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'InProgress',
      changedByUserId: 'it-1',
      diagnosis: 'Bad SSD',
    });
    const completed = await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'Completed',
      changedByUserId: 'it-1',
      resolutionNotes: 'Replaced SSD',
      actualCost: 189.5,
    });

    expect(completed.status).toBe('Completed');
    expect(completed.actualCostCents).toBe(18950);
    // seed inserts one (Pending), + three transitions
    expect(ctx.repairs.history).toHaveLength(4);
    expect(ctx.events.namesOf()).toEqual(
      expect.arrayContaining([
        'repair.opened',
        'repair.status-changed',
        'repair.completed',
      ]),
    );

    // Handler routes Completed → Available via the lifecycle-guarded flow.
    const completedEvent = ctx.events.emitted.find(
      (e) => e.name === 'repair.completed',
    );
    await ctx.handler.handle(completedEvent as unknown as RepairCompletedEvent);
    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.Available);
  });

  it('keeps the asset in UnderRepair when a repair fails', async () => {
    const ctx = build();
    const opened = await seed(ctx);
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'Diagnosing',
      changedByUserId: 'it-1',
    });
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'InProgress',
      changedByUserId: 'it-1',
    });
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'Failed',
      changedByUserId: 'it-1',
      note: 'part on back-order',
    });

    // The RepairCompletedEvent still fires with outcome=Failed; handler is a no-op.
    const failedEvent = ctx.events.emitted.find(
      (e) => e.name === 'repair.completed',
    );
    expect(failedEvent).toBeDefined();
    await ctx.handler.handle(failedEvent as unknown as RepairCompletedEvent);
    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.UnderRepair);
  });

  it('emits repair.beyond-repair without touching asset status', async () => {
    const ctx = build();
    const opened = await seed(ctx);
    await ctx.transition.execute({
      repairId: opened.id,
      toStatus: 'BeyondRepair',
      changedByUserId: 'it-1',
      note: 'Water damage, cost > replacement',
    });
    expect(ctx.events.namesOf()).toContain('repair.beyond-repair');
    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.UnderRepair);
  });
});
