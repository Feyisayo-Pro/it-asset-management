import { StartAssessmentUseCase } from '../../../src/modules/assessment/application/use-cases/start-assessment.use-case';
import { SaveAssessmentResultsUseCase } from '../../../src/modules/assessment/application/use-cases/save-assessment-results.use-case';
import { CompleteAssessmentRecordUseCase } from '../../../src/modules/assessment/application/use-cases/complete-assessment-record.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetNotFoundError } from '../../../src/common/errors/asset.errors';
import { AssessmentTemplateNotFoundError } from '../../../src/common/errors/assessment.errors';
import { FakeAssetRepository } from '../asset/fakes';
import {
  FakeAssessmentRecordRepository,
  FakeAssessmentTemplateRepository,
  buildStandardTemplate,
} from './fakes';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
} from '../fakes/fakes';

const build = () => {
  const templates = new FakeAssessmentTemplateRepository();
  const template = buildStandardTemplate();
  templates.add(template);
  const records = new FakeAssessmentRecordRepository();
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-12T00:00:00Z'));
  const events = new FakeEventPublisher();

  const start = new StartAssessmentUseCase(
    templates, records, assets, ids, clock, events as unknown as never,
  );
  const save = new SaveAssessmentResultsUseCase(records, templates, ids, clock);
  const complete = new CompleteAssessmentRecordUseCase(
    records, templates, clock, events as unknown as never,
  );
  return { start, save, complete, templates, template, records, assets, events };
};

const seedAsset = async (ctx: ReturnType<typeof build>) => {
  const asset = Asset.register({
    id: 'a1',
    assetTag: 'AST-2026-00001',
    deviceType: 'Laptop',
    brand: 'Acme',
    model: 'X1',
    serialNumber: 'SN1',
  });
  await ctx.assets.save(asset);
  return asset;
};

describe('Assessment use cases', () => {
  it('start → save → complete emits events and freezes the record', async () => {
    const ctx = build();
    await seedAsset(ctx);

    const record = await ctx.start.execute({
      assetId: 'a1',
      technicianUserId: 'it-1',
      contextType: 'Repair',
      contextId: 'rep-9',
    });
    expect(record.status).toBe('Draft');
    expect(ctx.events.namesOf()).toContain('assessment.started');

    await ctx.save.execute({
      assessmentId: record.id,
      entries: ctx.template.items.map((i) => ({
        itemCode: i.code,
        result: 'Pass' as const,
      })),
    });

    const { record: completed, specWarnings } = await ctx.complete.execute({
      assessmentId: record.id,
      outcome: 'NoFaultFound',
      findings: 'Everything checks out',
      signatureName: 'I.T. Tech',
    });
    expect(completed.status).toBe('Completed');
    expect(specWarnings).toEqual([]);

    const event = ctx.events.emitted.find((e) => e.name === 'assessment.completed');
    expect(event?.payload).toMatchObject({
      assetId: 'a1',
      contextType: 'Repair',
      contextId: 'rep-9',
      outcome: 'NoFaultFound',
      technicianUserId: 'it-1',
    });
  });

  it('start rejects an unknown asset', async () => {
    const ctx = build();
    await expect(
      ctx.start.execute({ assetId: 'ghost', technicianUserId: 'it-1' }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });

  it('start rejects an unknown template key', async () => {
    const ctx = build();
    await seedAsset(ctx);
    await expect(
      ctx.start.execute({
        assetId: 'a1',
        technicianUserId: 'it-1',
        templateKey: 'no-such-template',
      }),
    ).rejects.toBeInstanceOf(AssessmentTemplateNotFoundError);
  });

  it('defaults context to Standalone and template to the standard checklist', async () => {
    const ctx = build();
    await seedAsset(ctx);
    const record = await ctx.start.execute({
      assetId: 'a1',
      technicianUserId: 'it-1',
    });
    expect(record.contextType).toBe('Standalone');
    expect(record.templateId).toBe(ctx.template.id);
  });

  describe('HardwareSpecValidator integration (IT Technical Assessment step)', () => {
    const completeAllocationAssessment = async (
      ctx: ReturnType<typeof build>,
      extra: {
        targetRoleLevel?: string;
        deviceCpuTier?: 'Entry' | 'Standard' | 'Performance';
        deviceRamGb?: number;
        deviceStorageGb?: number;
      },
    ) => {
      await seedAsset(ctx);
      const record = await ctx.start.execute({
        assetId: 'a1',
        technicianUserId: 'it-1',
        contextType: 'Allocation',
        contextId: 'alloc-1',
      });
      await ctx.save.execute({
        assessmentId: record.id,
        entries: ctx.template.items.map((i) => ({ itemCode: i.code, result: 'Pass' as const })),
      });
      return ctx.complete.execute({
        assessmentId: record.id,
        outcome: 'NoFaultFound',
        findings: 'Checked',
        signatureName: 'I.T. Tech',
        targetRoleLevel: extra.targetRoleLevel,
        deviceSpec:
          extra.deviceCpuTier && extra.deviceRamGb != null && extra.deviceStorageGb != null
            ? { cpuTier: extra.deviceCpuTier, ramGb: extra.deviceRamGb, storageGb: extra.deviceStorageGb }
            : undefined,
      });
    };

    // Per the real matrix (docs/22-sapphire-virtual-source-data.md §1):
    // Manager requires Standard/16GB/512GB; GeneralManager requires
    // Performance/16GB/512GB.
    it('returns soft warnings for an under-spec device allocated to a role level with requirements', async () => {
      const ctx = build();
      const { specWarnings } = await completeAllocationAssessment(ctx, {
        targetRoleLevel: 'Manager',
        deviceCpuTier: 'Entry',
        deviceRamGb: 8,
        deviceStorageGb: 256,
      });
      expect(specWarnings.length).toBe(3);
      expect(specWarnings.some((w) => w.includes('CPU tier'))).toBe(true);
      expect(specWarnings.some((w) => w.includes('RAM'))).toBe(true);
      expect(specWarnings.some((w) => w.includes('storage'))).toBe(true);
    });

    it('returns no warnings when the device meets the role level minimum', async () => {
      const ctx = build();
      const { specWarnings } = await completeAllocationAssessment(ctx, {
        targetRoleLevel: 'GeneralManager',
        deviceCpuTier: 'Performance',
        deviceRamGb: 32,
        deviceStorageGb: 1024,
      });
      expect(specWarnings).toEqual([]);
    });

    it('skips the check when no target role level/spec is supplied', async () => {
      const ctx = build();
      const { specWarnings } = await completeAllocationAssessment(ctx, {});
      expect(specWarnings).toEqual([]);
    });

    it('is a no-op for Director (Executive Custom Request, no fixed minimum)', async () => {
      const ctx = build();
      const { specWarnings } = await completeAllocationAssessment(ctx, {
        targetRoleLevel: 'Director',
        deviceCpuTier: 'Entry',
        deviceRamGb: 4,
        deviceStorageGb: 128,
      });
      expect(specWarnings).toEqual([]);
    });

    it('does not run the check outside the Allocation context, even if spec info is supplied', async () => {
      const ctx = build();
      await seedAsset(ctx);
      const record = await ctx.start.execute({
        assetId: 'a1',
        technicianUserId: 'it-1',
        contextType: 'Standalone',
      });
      await ctx.save.execute({
        assessmentId: record.id,
        entries: ctx.template.items.map((i) => ({ itemCode: i.code, result: 'Pass' as const })),
      });
      const { specWarnings } = await ctx.complete.execute({
        assessmentId: record.id,
        outcome: 'NoFaultFound',
        findings: 'Checked',
        signatureName: 'I.T. Tech',
        targetRoleLevel: 'Manager',
        deviceSpec: { cpuTier: 'Entry', ramGb: 4, storageGb: 128 },
      });
      expect(specWarnings).toEqual([]);
    });
  });
});
