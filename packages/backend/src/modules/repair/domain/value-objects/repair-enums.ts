import { InvalidRepairStatusTransitionError } from '../../../../common/errors/repair.errors';

export const RepairStatus = {
  Pending: 'Pending',
  Diagnosing: 'Diagnosing',
  AwaitingParts: 'AwaitingParts',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Failed: 'Failed',
  BeyondRepair: 'BeyondRepair',
} as const;
export type RepairStatus = (typeof RepairStatus)[keyof typeof RepairStatus];
export const ALL_REPAIR_STATUSES: readonly RepairStatus[] = Object.values(RepairStatus);

/**
 * Terminal statuses stop further transitions. Failed is deliberately
 * NOT terminal — a repair can be re-attempted from Failed → InProgress.
 */
export const TERMINAL_REPAIR_STATUSES: readonly RepairStatus[] = [
  RepairStatus.Completed,
  RepairStatus.BeyondRepair,
];

const TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  Pending: ['Diagnosing', 'BeyondRepair'],
  Diagnosing: ['AwaitingParts', 'InProgress', 'BeyondRepair'],
  AwaitingParts: ['InProgress', 'BeyondRepair'],
  InProgress: ['Completed', 'Failed', 'BeyondRepair'],
  Failed: ['InProgress', 'BeyondRepair'],
  Completed: [],
  BeyondRepair: [],
};

export class RepairStatusMachine {
  static assertAllowed(from: RepairStatus, to: RepairStatus): void {
    if (from === to) return;
    if (!TRANSITIONS[from]?.includes(to)) {
      throw new InvalidRepairStatusTransitionError(from, to);
    }
  }
  static isTerminal(status: RepairStatus): boolean {
    return TERMINAL_REPAIR_STATUSES.includes(status);
  }
  static allowedNext(from: RepairStatus): RepairStatus[] {
    return TRANSITIONS[from] ?? [];
  }
}
