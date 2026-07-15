import {
  RepairStatus,
  RepairStatusMachine,
} from '../../../src/modules/repair/domain/value-objects/repair-enums';
import { InvalidRepairStatusTransitionError } from '../../../src/common/errors/repair.errors';

describe('RepairStatusMachine', () => {
  it('allows the happy-path Pending → Diagnosing → InProgress → Completed', () => {
    expect(() =>
      RepairStatusMachine.assertAllowed('Pending', 'Diagnosing'),
    ).not.toThrow();
    expect(() =>
      RepairStatusMachine.assertAllowed('Diagnosing', 'InProgress'),
    ).not.toThrow();
    expect(() =>
      RepairStatusMachine.assertAllowed('InProgress', 'Completed'),
    ).not.toThrow();
  });

  it('lets Failed retry back to InProgress (Failed is not terminal)', () => {
    expect(() =>
      RepairStatusMachine.assertAllowed('Failed', 'InProgress'),
    ).not.toThrow();
    expect(RepairStatusMachine.isTerminal('Failed')).toBe(false);
  });

  it('marks Completed and BeyondRepair as terminal', () => {
    expect(RepairStatusMachine.isTerminal('Completed')).toBe(true);
    expect(RepairStatusMachine.isTerminal('BeyondRepair')).toBe(true);
  });

  it('rejects illegal jumps like Pending → Completed', () => {
    expect(() =>
      RepairStatusMachine.assertAllowed('Pending', 'Completed'),
    ).toThrow(InvalidRepairStatusTransitionError);
  });

  it('has an empty next list for terminal states', () => {
    expect(RepairStatusMachine.allowedNext('Completed')).toEqual([]);
    expect(RepairStatusMachine.allowedNext('BeyondRepair')).toEqual([]);
  });

  it.each<[RepairStatus, RepairStatus]>([
    ['Pending', 'BeyondRepair'],
    ['Diagnosing', 'AwaitingParts'],
    ['AwaitingParts', 'InProgress'],
    ['InProgress', 'Failed'],
  ])('allows %s → %s', (from, to) => {
    expect(() => RepairStatusMachine.assertAllowed(from, to)).not.toThrow();
  });
});
