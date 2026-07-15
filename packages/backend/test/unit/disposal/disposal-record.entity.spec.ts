import { DisposalRecord } from '../../../src/modules/disposal/domain/entities/disposal-record.entity';
import { ApproverSignature } from '../../../src/modules/disposal/domain/value-objects/approver-signature';
import {
  DisposalAlreadyResolvedError,
  DisposalApprovalSignatureRequiredError,
  DisposalEvidenceRequiredError,
  DisposalRejectionReasonRequiredError,
  DisposalRequesterCannotApproveError,
} from '../../../src/common/errors/disposal.errors';

const now = new Date('2026-07-11T00:00:00Z');

const build = (overrides: Partial<Parameters<typeof DisposalRecord.request>[0]> = {}) =>
  DisposalRecord.request({
    id: 'd-1',
    assetId: 'a1',
    requestedByUserId: 'it-1',
    reason: 'BeyondRepair',
    method: 'EWasteRecycling',
    photoUrls: ['https://cdn/img/1.jpg'],
    now,
    ...overrides,
  });

describe('DisposalRecord entity', () => {
  it('starts as Requested with evidence normalised', () => {
    const r = build({
      evidenceUrls: [' https://docs/vendor-quote.pdf ', ''],
    });
    expect(r.status).toBe('Requested');
    expect(r.isResolved()).toBe(false);
    expect(r.evidenceUrls).toEqual(['https://docs/vendor-quote.pdf']);
    expect(r.photoUrls).toEqual(['https://cdn/img/1.jpg']);
  });

  it('refuses a request with no supporting evidence at all', () => {
    expect(() =>
      DisposalRecord.request({
        id: 'd-1',
        assetId: 'a1',
        requestedByUserId: 'it-1',
        reason: 'Obsolete',
        method: 'Sold',
        now,
      }),
    ).toThrow(DisposalEvidenceRequiredError);
  });

  it('approves with a typed signature, records approver + date + witness', () => {
    const r = build();
    const sig = ApproverSignature.create({
      printedName: 'Nifemi Ade',
      ip: '10.0.0.1',
    });
    r.approve({
      approverUserId: 'sa-1',
      signature: sig,
      disposalDate: new Date('2026-07-20'),
      witnessUserId: 'stores-1',
      approvalNotes: 'Verified damage',
      now,
    });
    expect(r.status).toBe('Approved');
    expect(r.approvedByUserId).toBe('sa-1');
    expect(r.witnessUserId).toBe('stores-1');
    expect(r.signatureName).toBe('Nifemi Ade');
    expect(r.disposalDate).toEqual(new Date('2026-07-20'));
    expect(r.isResolved()).toBe(true);
  });

  it('rejects an empty signature', () => {
    expect(() =>
      ApproverSignature.create({ printedName: '  ' }),
    ).toThrow(DisposalApprovalSignatureRequiredError);
  });

  it('blocks self-approval (segregation of duties)', () => {
    const r = build();
    const sig = ApproverSignature.create({ printedName: 'Requester Name' });
    expect(() =>
      r.approve({
        approverUserId: 'it-1',
        signature: sig,
        disposalDate: now,
        now,
      }),
    ).toThrow(DisposalRequesterCannotApproveError);
  });

  it('blocks self-rejection too', () => {
    const r = build();
    expect(() =>
      r.reject({
        approverUserId: 'it-1',
        rejectionReason: 'nope',
        now,
      }),
    ).toThrow(DisposalRequesterCannotApproveError);
  });

  it('requires a rejection reason', () => {
    const r = build();
    expect(() =>
      r.reject({
        approverUserId: 'sa-1',
        rejectionReason: '   ',
        now,
      }),
    ).toThrow(DisposalRejectionReasonRequiredError);
  });

  it('will not double-resolve', () => {
    const r = build();
    r.reject({
      approverUserId: 'sa-1',
      rejectionReason: 'still under warranty',
      now,
    });
    expect(r.status).toBe('Rejected');
    expect(() =>
      r.approve({
        approverUserId: 'sa-1',
        signature: ApproverSignature.create({ printedName: 'x' }),
        disposalDate: now,
        now,
      }),
    ).toThrow(DisposalAlreadyResolvedError);
  });
});
