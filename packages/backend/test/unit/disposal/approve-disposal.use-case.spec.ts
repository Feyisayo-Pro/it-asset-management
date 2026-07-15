import { RequestDisposalUseCase } from '../../../src/modules/disposal/application/use-cases/request-disposal.use-case';
import { ApproveDisposalUseCase } from '../../../src/modules/disposal/application/use-cases/approve-disposal.use-case';
import { RejectDisposalUseCase } from '../../../src/modules/disposal/application/use-cases/reject-disposal.use-case';
import { DisposalApprovedHandler } from '../../../src/modules/disposal/application/handlers/disposal-approved.handler';
import { ChangeAssetStatusUseCase } from '../../../src/modules/asset/application/use-cases/change-asset-status.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import {
  DisposalApprovalSignatureRequiredError,
  DisposalRejectionReasonRequiredError,
  DisposalRequesterCannotApproveError,
} from '../../../src/common/errors/disposal.errors';
import { DisposalApprovedEvent } from '../../../src/modules/disposal/domain/events/disposal.events';
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
  const changeAssetStatus = new ChangeAssetStatusUseCase(
    assets,
    ids,
    clock,
    events as unknown as never,
  );
  const request = new RequestDisposalUseCase(
    disposals,
    assets,
    ids,
    clock,
    events as unknown as never,
  );
  const approve = new ApproveDisposalUseCase(
    disposals,
    clock,
    events as unknown as never,
  );
  const reject = new RejectDisposalUseCase(
    disposals,
    clock,
    events as unknown as never,
  );
  const handler = new DisposalApprovedHandler(changeAssetStatus);
  return { request, approve, reject, handler, disposals, assets, events };
};

const seedRequest = async (ctx: ReturnType<typeof build>) => {
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
  asset.changeStatus(AssetStatus.UnderRepair, now);
  await ctx.assets.save(asset);
  return ctx.request.execute({
    assetId: 'a1',
    requestedByUserId: 'it-1',
    reason: 'BeyondRepair',
    method: 'EWasteRecycling',
    photoUrls: ['https://cdn/img/1.jpg'],
  });
};

describe('ApproveDisposalUseCase', () => {
  it('approves with signature, emits disposal.approved, handler flips asset to Disposed', async () => {
    const ctx = build();
    const req = await seedRequest(ctx);

    const approved = await ctx.approve.execute({
      disposalId: req.id,
      approverUserId: 'sa-1',
      signaturePrintedName: 'Nifemi Ade',
      signatureIp: '10.0.0.5',
      disposalDate: new Date('2026-07-20'),
      witnessUserId: 'stores-1',
      approvalNotes: 'Verified damage in person',
    });
    expect(approved.status).toBe('Approved');
    expect(approved.signatureName).toBe('Nifemi Ade');
    expect(approved.signatureIp).toBe('10.0.0.5');

    const evt = ctx.events.emitted.find((e) => e.name === 'disposal.approved');
    expect(evt).toBeDefined();
    await ctx.handler.handle(evt as unknown as DisposalApprovedEvent);

    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.Disposed);
    expect(asset?.currentHolderId).toBeNull();
  });

  it('rejects self-approval (requester cannot approve their own request)', async () => {
    const ctx = build();
    const req = await seedRequest(ctx);
    await expect(
      ctx.approve.execute({
        disposalId: req.id,
        approverUserId: 'it-1',
        signaturePrintedName: 'Whoever',
        disposalDate: now,
      }),
    ).rejects.toBeInstanceOf(DisposalRequesterCannotApproveError);
  });

  it('rejects an approval with an empty signature', async () => {
    const ctx = build();
    const req = await seedRequest(ctx);
    await expect(
      ctx.approve.execute({
        disposalId: req.id,
        approverUserId: 'sa-1',
        signaturePrintedName: '  ',
        disposalDate: now,
      }),
    ).rejects.toBeInstanceOf(DisposalApprovalSignatureRequiredError);
  });

  it('rejects a rejection with no reason supplied', async () => {
    const ctx = build();
    const req = await seedRequest(ctx);
    await expect(
      ctx.reject.execute({
        disposalId: req.id,
        approverUserId: 'sa-1',
        rejectionReason: '  ',
      }),
    ).rejects.toBeInstanceOf(DisposalRejectionReasonRequiredError);
  });

  it('records a valid rejection and emits disposal.rejected', async () => {
    const ctx = build();
    const req = await seedRequest(ctx);
    const rejected = await ctx.reject.execute({
      disposalId: req.id,
      approverUserId: 'sa-1',
      rejectionReason: 'Warranty is still active — return to vendor first',
    });
    expect(rejected.status).toBe('Rejected');
    expect(rejected.rejectionReason).toContain('Warranty');
    expect(ctx.events.namesOf()).toContain('disposal.rejected');
    const asset = await ctx.assets.findById('a1');
    expect(asset?.status).toBe(AssetStatus.UnderRepair);
  });
});
