import { RepairRecord } from '../../../src/modules/repair/domain/entities/repair-record.entity';
import {
  InvalidRepairStatusTransitionError,
  RepairAlreadyTerminalError,
  RepairCompletionMissingDataError,
} from '../../../src/common/errors/repair.errors';

const now = new Date('2026-07-11T00:00:00Z');

const build = () =>
  RepairRecord.open({
    id: 'rep-1',
    assetId: 'a1',
    employeeUserId: 'emp-1',
    reportedFault: 'Screen flickering',
    createdByUserId: 'it-1',
    now,
  });

describe('RepairRecord entity', () => {
  it('opens in Pending with the reported fault trimmed', () => {
    const r = RepairRecord.open({
      id: 'rep-1',
      assetId: 'a1',
      employeeUserId: 'emp-1',
      reportedFault: '  Won\'t boot  ',
      createdByUserId: 'it-1',
      now,
    });
    expect(r.status).toBe('Pending');
    expect(r.reportedFault).toBe("Won't boot");
    expect(r.completedAt).toBeNull();
    expect(r.isTerminal()).toBe(false);
  });

  it('rejects an empty reported fault', () => {
    expect(() =>
      RepairRecord.open({
        id: 'rep-1',
        assetId: 'a1',
        employeeUserId: null,
        reportedFault: '   ',
        createdByUserId: 'it-1',
        now,
      }),
    ).toThrow(RepairCompletionMissingDataError);
  });

  it('records startedAt on the first non-Pending transition', () => {
    const r = build();
    r.transition({ to: 'Diagnosing', now });
    expect(r.startedAt).toEqual(now);
    expect(r.status).toBe('Diagnosing');
  });

  it('refuses Completed without resolution notes + actual cost', () => {
    const r = build();
    r.transition({ to: 'Diagnosing', now });
    r.transition({ to: 'InProgress', now });
    expect(() => r.transition({ to: 'Completed', now })).toThrow(
      RepairCompletionMissingDataError,
    );
    expect(() =>
      r.transition({
        to: 'Completed',
        resolutionNotes: 'replaced screen',
        now,
      }),
    ).toThrow(RepairCompletionMissingDataError);
  });

  it('completes cleanly when notes + cost are supplied', () => {
    const r = build();
    r.transition({ to: 'Diagnosing', now });
    r.transition({ to: 'InProgress', now });
    r.transition({
      to: 'Completed',
      resolutionNotes: 'replaced screen',
      actualCostCents: 12500,
      now,
    });
    expect(r.status).toBe('Completed');
    expect(r.completedAt).toEqual(now);
    expect(r.actualCostCents).toBe(12500);
    expect(r.isTerminal()).toBe(true);
  });

  it('rejects mutating a terminal record', () => {
    const r = build();
    r.transition({ to: 'BeyondRepair', now });
    expect(r.isTerminal()).toBe(true);
    expect(() => r.transition({ to: 'InProgress', now })).toThrow(
      RepairAlreadyTerminalError,
    );
    expect(() => r.assign({ vendor: 'x', now })).toThrow(RepairAlreadyTerminalError);
  });

  it('lets Failed retry back to InProgress', () => {
    const r = build();
    r.transition({ to: 'Diagnosing', now });
    r.transition({ to: 'InProgress', now });
    r.transition({ to: 'Failed', now });
    expect(r.isTerminal()).toBe(false);
    r.transition({ to: 'InProgress', now });
    expect(r.status).toBe('InProgress');
  });

  it('blocks illegal transitions via the state machine', () => {
    const r = build();
    expect(() => r.transition({ to: 'Completed', now })).toThrow(
      InvalidRepairStatusTransitionError,
    );
  });
});
