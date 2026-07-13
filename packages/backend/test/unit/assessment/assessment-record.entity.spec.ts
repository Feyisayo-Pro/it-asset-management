import { AssessmentRecord } from '../../../src/modules/assessment/domain/entities/assessment-record.entity';
import {
  AssessmentAlreadyCompletedError,
  AssessmentSignatureRequiredError,
  ChecklistIncompleteError,
  FailedItemNoteRequiredError,
  RecommendationsRequiredError,
  UnknownChecklistItemError,
} from '../../../src/common/errors/assessment.errors';
import { buildStandardTemplate } from './fakes';

const now = new Date('2026-07-12T00:00:00Z');
let seq = 0;
const nextId = () => `res-${++seq}`;
const template = buildStandardTemplate();

const build = () =>
  AssessmentRecord.start({
    id: 'as-1',
    templateId: template.id,
    assetId: 'a1',
    contextType: 'Return',
    contextId: 'ret-1',
    technicianUserId: 'it-1',
    now,
  });

const answerAll = (record: AssessmentRecord, result: 'Pass' | 'NA' = 'Pass') => {
  record.saveResults(
    template,
    template.items.map((i) => ({ itemCode: i.code, result })),
    nextId,
    now,
  );
};

describe('AssessmentRecord entity', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('starts as a Draft bound to its context', () => {
    const r = build();
    expect(r.status).toBe('Draft');
    expect(r.contextType).toBe('Return');
    expect(r.contextId).toBe('ret-1');
  });

  it('rejects results for items not on the template', () => {
    const r = build();
    expect(() =>
      r.saveResults(template, [{ itemCode: 'flux_capacitor', result: 'Pass' }], nextId, now),
    ).toThrow(UnknownChecklistItemError);
  });

  it('upserts results — saving the same item twice keeps one entry', () => {
    const r = build();
    r.saveResults(template, [{ itemCode: 'screen', result: 'Pass' }], nextId, now);
    r.saveResults(
      template,
      [{ itemCode: 'screen', result: 'Fail', note: 'dead pixels' }],
      nextId,
      now,
    );
    expect(r.results).toHaveLength(1);
    expect(r.results[0].result).toBe('Fail');
  });

  it('refuses completion while required items are unanswered', () => {
    const r = build();
    r.saveResults(template, [{ itemCode: 'screen', result: 'Pass' }], nextId, now);
    expect(() =>
      r.complete(
        template,
        { outcome: 'Pass', findings: 'ok', signatureName: 'Tech' },
        now,
      ),
    ).toThrow(ChecklistIncompleteError);
  });

  it('refuses completion when a failed item has no note', () => {
    const r = build();
    answerAll(r);
    r.saveResults(template, [{ itemCode: 'battery', result: 'Fail' }], nextId, now);
    expect(() =>
      r.complete(
        template,
        {
          outcome: 'RepairRecommended',
          findings: 'battery bad',
          recommendations: 'replace battery',
          signatureName: 'Tech',
        },
        now,
      ),
    ).toThrow(FailedItemNoteRequiredError);
  });

  it('requires recommendations for non-Pass outcomes', () => {
    const r = build();
    answerAll(r);
    expect(() =>
      r.complete(
        template,
        { outcome: 'Reject', findings: 'unusable', signatureName: 'Tech' },
        now,
      ),
    ).toThrow(RecommendationsRequiredError);
  });

  it('requires a technician signature', () => {
    const r = build();
    answerAll(r);
    expect(() =>
      r.complete(
        template,
        { outcome: 'Pass', findings: 'all good', signatureName: '  ' },
        now,
      ),
    ).toThrow(AssessmentSignatureRequiredError);
  });

  it('completes with a full checklist and freezes the record', () => {
    const r = build();
    answerAll(r);
    r.complete(
      template,
      {
        outcome: 'Pass',
        findings: 'All 22 checks passed',
        photoUrls: ['https://x/1.jpg'],
        signatureName: 'I.T. Tech',
        signatureIp: '10.0.0.1',
      },
      now,
    );
    expect(r.status).toBe('Completed');
    expect(r.completedAt).toEqual(now);
    expect(r.signatureName).toBe('I.T. Tech');
    expect(r.signatureIp).toBe('10.0.0.1');
    expect(r.photoUrls).toEqual(['https://x/1.jpg']);

    // Immutable afterwards
    expect(() =>
      r.saveResults(template, [{ itemCode: 'screen', result: 'Fail', note: 'x' }], nextId, now),
    ).toThrow(AssessmentAlreadyCompletedError);
    expect(() =>
      r.complete(
        template,
        { outcome: 'Pass', findings: 'again', signatureName: 'T' },
        now,
      ),
    ).toThrow(AssessmentAlreadyCompletedError);
  });
});
