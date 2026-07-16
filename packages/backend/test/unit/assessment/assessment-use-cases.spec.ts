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

    const completed = await ctx.complete.execute({
      assessmentId: record.id,
      outcome: 'Pass',
      findings: 'Everything checks out',
      signatureName: 'I.T. Tech',
    });
    expect(completed.status).toBe('Completed');

    const event = ctx.events.emitted.find((e) => e.name === 'assessment.completed');
    expect(event?.payload).toMatchObject({
      assetId: 'a1',
      contextType: 'Repair',
      contextId: 'rep-9',
      outcome: 'Pass',
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
});
