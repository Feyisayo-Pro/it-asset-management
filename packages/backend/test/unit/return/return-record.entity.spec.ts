import { ReturnRecord } from '../../../src/modules/return/domain/entities/return-record.entity';
import {
  AssessmentIncompleteError,
  ReturnItemNotesRequiredError,
  ReturnItemsRequiredError,
} from '../../../src/common/errors/return.errors';

const now = new Date('2026-07-11T00:00:00Z');
let seq = 0;
const nextId = () => `item-${++seq}`;

const build = () =>
  ReturnRecord.initiate({
    id: 'ret-1',
    assetId: 'a1',
    holderUserId: 'emp-1',
    initiatedByUserId: 'emp-1',
    reason: 'Resignation',
    now,
  });

describe('ReturnRecord entity', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('starts in Initiated with no items', () => {
    const r = build();
    expect(r.currentState).toBe('Initiated');
    expect(r.items).toHaveLength(0);
    expect(r.isTerminal()).toBe(false);
  });

  it('rejects an empty items list', () => {
    const r = build();
    expect(() => r.recordItems([], nextId, now)).toThrow(ReturnItemsRequiredError);
  });

  it('requires notes on Missing and Damaged items', () => {
    const r = build();
    expect(() =>
      r.recordItems(
        [{ itemType: 'Charger', description: null, status: 'Missing', notes: null }],
        nextId,
        now,
      ),
    ).toThrow(ReturnItemNotesRequiredError);
    expect(() =>
      r.recordItems(
        [{ itemType: 'Laptop', description: null, status: 'Damaged', notes: '  ' }],
        nextId,
        now,
      ),
    ).toThrow(ReturnItemNotesRequiredError);
  });

  it('records a valid item list, replacing any prior list', () => {
    const r = build();
    r.recordItems(
      [
        { itemType: 'Laptop', description: 'X1', status: 'Returned', notes: null },
        { itemType: 'Charger', description: null, status: 'Missing', notes: 'left at home' },
      ],
      nextId,
      now,
    );
    expect(r.items).toHaveLength(2);
    r.recordItems(
      [{ itemType: 'Laptop', description: 'X1', status: 'Returned', notes: null }],
      nextId,
      now,
    );
    expect(r.items).toHaveLength(1);
  });

  it('requires findings on assessment', () => {
    const r = build();
    expect(() =>
      r.recordAssessment({ findings: '  ', outcome: 'Pass' }, now),
    ).toThrow(AssessmentIncompleteError);
  });

  it('requires damage notes when any item is Damaged', () => {
    const r = build();
    r.recordItems(
      [{ itemType: 'Laptop', description: null, status: 'Damaged', notes: 'cracked lid' }],
      nextId,
      now,
    );
    expect(() =>
      r.recordAssessment({ findings: 'inspected', outcome: 'RepairRecommended' }, now),
    ).toThrow(AssessmentIncompleteError);
    r.recordAssessment(
      {
        findings: 'inspected',
        outcome: 'RepairRecommended',
        damageNotes: 'lid cracked, hinge bent',
      },
      now,
    );
    expect(r.outcome).toBe('RepairRecommended');
  });

  it('requires missing-accessory list when any item is Missing', () => {
    const r = build();
    r.recordItems(
      [{ itemType: 'Mouse', description: null, status: 'Missing', notes: 'not returned' }],
      nextId,
      now,
    );
    expect(() =>
      r.recordAssessment({ findings: 'ok otherwise', outcome: 'Pass' }, now),
    ).toThrow(AssessmentIncompleteError);
    r.recordAssessment(
      { findings: 'ok otherwise', outcome: 'Pass', missingAccessories: 'Mouse' },
      now,
    );
    expect(r.missingAccessories).toBe('Mouse');
  });

  it('stores optional photo URLs', () => {
    const r = build();
    r.recordItems(
      [{ itemType: 'Laptop', description: null, status: 'Returned', notes: null }],
      nextId,
      now,
    );
    r.recordAssessment(
      { findings: 'fine', outcome: 'Pass', photoUrls: ['https://x/1.jpg'] },
      now,
    );
    expect(r.photoUrls).toEqual(['https://x/1.jpg']);
  });
});
