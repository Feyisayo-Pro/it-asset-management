import { InitiateReturnUseCase } from '../../../src/modules/return/application/use-cases/initiate-return.use-case';
import { CreateWorkflowInstanceUseCase } from '../../../src/modules/workflow/application/use-cases/create-workflow-instance.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import {
  ActiveReturnExistsError,
  AssetNotReturnableError,
  NotAssetHolderError,
} from '../../../src/common/errors/return.errors';
import { AssetNotFoundError } from '../../../src/common/errors/asset.errors';
import { FakeAssetRepository } from '../asset/fakes';
import { FakeReturnRepository } from './fakes';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
} from '../fakes/fakes';
import {
  FakeWorkflowDefinitionRepository,
  FakeWorkflowInstanceRepository,
  buildAssetReturnDefinition,
} from '../workflow/fakes';

const build = () => {
  const returns = new FakeReturnRepository();
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-11T00:00:00Z'));
  const events = new FakeEventPublisher();

  const defs = new FakeWorkflowDefinitionRepository();
  defs.add(buildAssetReturnDefinition());
  const instances = new FakeWorkflowInstanceRepository();
  const createInstance = new CreateWorkflowInstanceUseCase(
    defs,
    instances,
    ids,
    clock,
    events as unknown as never,
  );

  const useCase = new InitiateReturnUseCase(
    returns,
    assets,
    ids,
    clock,
    createInstance,
    events as unknown as never,
  );
  return { useCase, returns, assets, instances, events, clock };
};

const seedAllocatedAsset = async (
  ctx: ReturnType<typeof build>,
  holderId = 'emp-1',
) => {
  const asset = Asset.register({
    id: 'a1',
    assetTag: 'AST-2026-00001',
    deviceType: 'Laptop',
    brand: 'Acme',
    model: 'X1',
    serialNumber: 'SN1',
  });
  asset.changeStatus(AssetStatus.Available, new Date());
  asset.changeStatus(AssetStatus.Allocated, new Date(), holderId);
  await ctx.assets.save(asset);
  return asset;
};

describe('InitiateReturnUseCase', () => {
  it('creates the record, starts the workflow, emits return.initiated', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx);

    const record = await ctx.useCase.execute({
      assetId: 'a1',
      reason: 'Resignation',
      actorUserId: 'emp-1',
      actorRole: 'EMPLOYEE',
    });

    expect(record.currentState).toBe('Initiated');
    expect(record.workflowInstanceId).not.toBeNull();
    const instance = await ctx.instances.findBySubject('ReturnRecord', record.id);
    expect(instance?.currentState).toBe('Initiated');
    expect(ctx.events.namesOf()).toEqual(
      expect.arrayContaining(['workflow.instance.created', 'return.initiated']),
    );
  });

  it('lets P&C initiate on behalf of a holder', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx, 'emp-1');
    const record = await ctx.useCase.execute({
      assetId: 'a1',
      reason: 'Termination',
      actorUserId: 'pc-user',
      actorRole: 'PEOPLE_CULTURE',
    });
    expect(record.holderUserId).toBe('emp-1');
  });

  it('rejects an employee returning someone else’s asset', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx, 'emp-1');
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        reason: 'Other',
        actorUserId: 'someone-else',
        actorRole: 'EMPLOYEE',
      }),
    ).rejects.toBeInstanceOf(NotAssetHolderError);
  });

  it('rejects a non-allocated asset', async () => {
    const ctx = build();
    const asset = Asset.register({
      id: 'a1',
      assetTag: 'AST-2026-00001',
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
    });
    await ctx.assets.save(asset); // still in Registration
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        reason: 'Repair',
        actorUserId: 'pc-user',
        actorRole: 'PEOPLE_CULTURE',
      }),
    ).rejects.toBeInstanceOf(AssetNotReturnableError);
  });

  it('rejects a second active return for the same asset', async () => {
    const ctx = build();
    await seedAllocatedAsset(ctx);
    await ctx.useCase.execute({
      assetId: 'a1',
      reason: 'Repair',
      actorUserId: 'emp-1',
      actorRole: 'EMPLOYEE',
    });
    await expect(
      ctx.useCase.execute({
        assetId: 'a1',
        reason: 'Repair',
        actorUserId: 'emp-1',
        actorRole: 'EMPLOYEE',
      }),
    ).rejects.toBeInstanceOf(ActiveReturnExistsError);
  });

  it('rejects an unknown asset', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        assetId: '00000000-0000-0000-0000-000000000000',
        reason: 'Other',
        actorUserId: 'u',
        actorRole: 'PEOPLE_CULTURE',
      }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });
});
