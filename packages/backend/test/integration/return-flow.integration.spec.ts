/**
 * Integration test — composes the REAL use cases, REAL workflow engine,
 * and REAL completion handler across four modules (Return, Workflow,
 * Asset, common event bus), with in-memory repositories standing in
 * for Postgres. Exercises the full return journey end-to-end:
 *
 *   initiate → record-items → complete-assessment
 *     → sign-employee → sign-it → sign-pc
 *     → workflow.completed → inventory updated, holder cleared,
 *       return.completed emitted
 *
 * DB-backed integration tests (npm run test:integration against
 * Postgres) reuse the same journey once the CI database is wired.
 */
import { InitiateReturnUseCase } from '../../src/modules/return/application/use-cases/initiate-return.use-case';
import { RecordReturnItemsUseCase } from '../../src/modules/return/application/use-cases/record-return-items.use-case';
import { CompleteAssessmentUseCase } from '../../src/modules/return/application/use-cases/complete-assessment.use-case';
import { SignReturnUseCase } from '../../src/modules/return/application/use-cases/sign-return.use-case';
import { ReturnWorkflowCompletedHandler } from '../../src/modules/return/application/handlers/return-workflow-completed.handler';
import { CreateWorkflowInstanceUseCase } from '../../src/modules/workflow/application/use-cases/create-workflow-instance.use-case';
import { TransitionWorkflowUseCase } from '../../src/modules/workflow/application/use-cases/transition-workflow.use-case';
import { ChangeAssetStatusUseCase } from '../../src/modules/asset/application/use-cases/change-asset-status.use-case';
import { Asset } from '../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../src/modules/asset/domain/value-objects/asset-status';
import { WorkflowCompletedEvent } from '../../src/modules/workflow/domain/events/workflow.events';
import { DomainEvent } from '../../src/common/events/base-event';
import {
  RoleNotAllowedForTransitionError,
  TransitionRequiresSignatureError,
} from '../../src/common/errors/workflow.errors';
import { FakeAssetRepository } from '../unit/asset/fakes';
import { FakeReturnRepository } from '../unit/return/fakes';
import {
  FakeClock,
  FakeIdGenerator,
} from '../unit/fakes/fakes';
import {
  FakeWorkflowDefinitionRepository,
  FakeWorkflowInstanceRepository,
  buildAssetReturnDefinition,
} from '../unit/workflow/fakes';

/**
 * Minimal synchronous event bus: routes workflow.completed to the
 * completion handler exactly as @nestjs/event-emitter would, and
 * records every published event for assertions.
 */
class TestEventBus {
  emitted: Array<{ name: string; payload: unknown }> = [];
  private completedHandler: ReturnWorkflowCompletedHandler | null = null;
  private pending: Promise<void>[] = [];

  bindCompletionHandler(handler: ReturnWorkflowCompletedHandler): void {
    this.completedHandler = handler;
  }
  publish<T>(event: DomainEvent<T>): void {
    this.emitted.push({ name: event.name, payload: event.payload });
    if (event.name === 'workflow.completed' && this.completedHandler) {
      this.pending.push(
        this.completedHandler.handle(event as unknown as WorkflowCompletedEvent),
      );
    }
  }
  async settle(): Promise<void> {
    await Promise.all(this.pending);
    this.pending = [];
  }
  namesOf(): string[] {
    return this.emitted.map((e) => e.name);
  }
}

interface World {
  initiate: InitiateReturnUseCase;
  recordItems: RecordReturnItemsUseCase;
  assess: CompleteAssessmentUseCase;
  sign: SignReturnUseCase;
  bus: TestEventBus;
  assets: FakeAssetRepository;
  returns: FakeReturnRepository;
  instances: FakeWorkflowInstanceRepository;
}

const buildWorld = (): World => {
  const clock = new FakeClock(new Date('2026-07-11T00:00:00Z'));
  const ids = new FakeIdGenerator();
  const bus = new TestEventBus();

  const assets = new FakeAssetRepository();
  const returns = new FakeReturnRepository();
  const defs = new FakeWorkflowDefinitionRepository();
  defs.add(buildAssetReturnDefinition());
  const instances = new FakeWorkflowInstanceRepository();

  const createInstance = new CreateWorkflowInstanceUseCase(
    defs, instances, ids, clock, bus as unknown as never,
  );
  const transition = new TransitionWorkflowUseCase(
    defs, instances, ids, clock, bus as unknown as never,
  );
  const changeAssetStatus = new ChangeAssetStatusUseCase(
    assets, ids, clock, bus as unknown as never,
  );

  const initiate = new InitiateReturnUseCase(
    returns, assets, ids, clock, createInstance, bus as unknown as never,
  );
  const recordItems = new RecordReturnItemsUseCase(
    returns, ids, clock, transition, bus as unknown as never,
  );
  const assess = new CompleteAssessmentUseCase(
    returns, clock, transition, bus as unknown as never,
  );
  const sign = new SignReturnUseCase(returns, clock, transition);

  const completionHandler = new ReturnWorkflowCompletedHandler(
    returns, clock, changeAssetStatus, bus as unknown as never,
  );
  bus.bindCompletionHandler(completionHandler);

  return { initiate, recordItems, assess, sign, bus, assets, returns, instances };
};

const seedAllocatedAsset = async (world: World, holderId = 'emp-1') => {
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
  await world.assets.save(asset);
  return asset;
};

describe('Return flow (integration)', () => {
  it('runs the full journey and updates inventory on completion', async () => {
    const world = buildWorld();
    await seedAllocatedAsset(world);

    // 1. Employee initiates
    const record = await world.initiate.execute({
      assetId: 'a1',
      reason: 'Resignation',
      actorUserId: 'emp-1',
      actorRole: 'EMPLOYEE',
    });

    // 2. Stores records the returned items
    await world.recordItems.execute({
      returnId: record.id,
      actorUserId: 'stores-1',
      actorRole: 'STORES_OFFICER',
      items: [
        { itemType: 'Laptop', status: 'Returned' },
        { itemType: 'Charger', status: 'Returned' },
        { itemType: 'Mouse', status: 'Missing', notes: 'not handed in' },
      ],
    });

    // 3. IT completes the assessment
    await world.assess.execute({
      returnId: record.id,
      actorUserId: 'it-1',
      actorRole: 'IT_REP',
      findings: 'Device in good condition, mouse missing.',
      outcome: 'Pass',
      missingAccessories: 'Mouse',
      photoUrls: ['https://files/return-1.jpg'],
    });

    // 4-6. Three signatures in order
    await world.sign.execute({
      returnId: record.id,
      actionName: 'sign-employee',
      actorUserId: 'emp-1',
      actorRole: 'EMPLOYEE',
      signatureName: 'Em Ployee',
    });
    await world.sign.execute({
      returnId: record.id,
      actionName: 'sign-it',
      actorUserId: 'it-1',
      actorRole: 'IT_REP',
      signatureName: 'I.T. Rep',
    });
    await world.sign.execute({
      returnId: record.id,
      actionName: 'sign-pc',
      actorUserId: 'pc-1',
      actorRole: 'PEOPLE_CULTURE',
      signatureName: 'Pea Cee',
    });
    await world.bus.settle();

    // Record reached terminal state
    const final = await world.returns.findById(record.id);
    expect(final?.currentState).toBe('Completed');

    // Inventory updated: Allocated → Returned → Available, holder cleared
    const asset = await world.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.Available);
    expect(asset?.currentHolderId).toBeNull();

    // Every stage left an append-only transition with signatures kept
    const transitions = world.instances.transitions;
    expect(transitions.map((t) => t.actionName)).toEqual([
      'record-items',
      'complete-assessment',
      'sign-employee',
      'sign-it',
      'sign-pc',
    ]);
    expect(transitions[2].signatureName).toBe('Em Ployee');
    expect(transitions[4].signatureName).toBe('Pea Cee');

    // Events: audit + notification trigger points all fired
    expect(world.bus.namesOf()).toEqual(
      expect.arrayContaining([
        'return.initiated',
        'return.items-recorded',
        'return.assessed',
        'workflow.completed',
        'asset.status-changed',
        'return.completed',
      ]),
    );
    const completed = world.bus.emitted.find((e) => e.name === 'return.completed');
    expect(completed?.payload).toMatchObject({
      assetId: 'a1',
      outcome: 'Pass',
      finalAssetStatus: 'Available',
    });
  });

  it('routes RepairRecommended outcomes to UnderRepair', async () => {
    const world = buildWorld();
    await seedAllocatedAsset(world);
    const record = await world.initiate.execute({
      assetId: 'a1', reason: 'Repair', actorUserId: 'emp-1', actorRole: 'EMPLOYEE',
    });
    await world.recordItems.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      items: [{ itemType: 'Laptop', status: 'Damaged', notes: 'screen cracked' }],
    });
    await world.assess.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      findings: 'Cracked panel', outcome: 'RepairRecommended',
      damageNotes: 'LCD shattered top-left',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-employee',
      actorUserId: 'emp-1', actorRole: 'EMPLOYEE', signatureName: 'E',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-it',
      actorUserId: 'it-1', actorRole: 'IT_REP', signatureName: 'I',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-pc',
      actorUserId: 'pc-1', actorRole: 'PEOPLE_CULTURE', signatureName: 'P',
    });
    await world.bus.settle();

    expect((await world.assets.findById('a1'))?.status).toBe(AssetStatus.UnderRepair);
  });

  it('marks the asset Lost when the return reason is Lost', async () => {
    const world = buildWorld();
    await seedAllocatedAsset(world);
    const record = await world.initiate.execute({
      assetId: 'a1', reason: 'Lost', actorUserId: 'pc-1', actorRole: 'PEOPLE_CULTURE',
    });
    await world.recordItems.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      items: [{ itemType: 'Laptop', status: 'Missing', notes: 'device lost in transit' }],
    });
    await world.assess.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      findings: 'Device unrecoverable', outcome: 'Reject',
      missingAccessories: 'Laptop, charger',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-employee',
      actorUserId: 'emp-1', actorRole: 'EMPLOYEE', signatureName: 'E',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-it',
      actorUserId: 'it-1', actorRole: 'IT_REP', signatureName: 'I',
    });
    await world.sign.execute({
      returnId: record.id, actionName: 'sign-pc',
      actorUserId: 'pc-1', actorRole: 'PEOPLE_CULTURE', signatureName: 'P',
    });
    await world.bus.settle();

    const asset = await world.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.Lost);
    expect(asset?.currentHolderId).toBeNull();
  });

  it('enforces stage roles and signature requirements from config', async () => {
    const world = buildWorld();
    await seedAllocatedAsset(world);
    const record = await world.initiate.execute({
      assetId: 'a1', reason: 'Transfer', actorUserId: 'emp-1', actorRole: 'EMPLOYEE',
    });

    // Employee cannot record items (config says IT/Stores/SA)
    await expect(
      world.recordItems.execute({
        returnId: record.id, actorUserId: 'emp-1', actorRole: 'EMPLOYEE',
        items: [{ itemType: 'Laptop', status: 'Returned' }],
      }),
    ).rejects.toBeInstanceOf(RoleNotAllowedForTransitionError);

    await world.recordItems.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      items: [{ itemType: 'Laptop', status: 'Returned' }],
    });
    await world.assess.execute({
      returnId: record.id, actorUserId: 'it-1', actorRole: 'IT_REP',
      findings: 'fine', outcome: 'Pass',
    });

    // Signature transitions refuse a missing signature
    await expect(
      world.sign.execute({
        returnId: record.id, actionName: 'sign-employee',
        actorUserId: 'emp-1', actorRole: 'EMPLOYEE',
      }),
    ).rejects.toBeInstanceOf(TransitionRequiresSignatureError);
  });

  it('cancellation ends the workflow without touching inventory', async () => {
    const world = buildWorld();
    await seedAllocatedAsset(world);
    const record = await world.initiate.execute({
      assetId: 'a1', reason: 'Other', actorUserId: 'emp-1', actorRole: 'EMPLOYEE',
    });

    await world.sign.execute({
      returnId: record.id, actionName: 'cancel',
      actorUserId: 'pc-1', actorRole: 'PEOPLE_CULTURE',
      comment: 'Filed by mistake',
    });
    await world.bus.settle();

    expect((await world.returns.findById(record.id))?.currentState).toBe('Cancelled');
    const asset = await world.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.Allocated);
    expect(asset?.currentHolderId).toBe('emp-1');
    expect(world.bus.namesOf()).toContain('return.cancelled');
    expect(world.bus.namesOf()).not.toContain('return.completed');
  });
});
