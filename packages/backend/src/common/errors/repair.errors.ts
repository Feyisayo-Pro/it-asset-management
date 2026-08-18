import { ApplicationError, DomainError } from './domain.error';

export class RepairNotFoundError extends ApplicationError {
  readonly code = 'REPAIR_NOT_FOUND';
  constructor(id: string) {
    super('Repair record not found', { id });
  }
}

export class ActiveRepairExistsError extends ApplicationError {
  readonly code = 'ACTIVE_REPAIR_EXISTS';
  constructor(assetId: string) {
    super('Asset already has an active repair', { assetId });
  }
}

export class InvalidRepairStatusTransitionError extends DomainError {
  readonly code = 'INVALID_REPAIR_STATUS_TRANSITION';
  constructor(from: string, to: string) {
    super(`Illegal repair status transition ${from} → ${to}`, { from, to });
  }
}

export class RepairAlreadyTerminalError extends ApplicationError {
  readonly code = 'REPAIR_ALREADY_TERMINAL';
  constructor(id: string) {
    super('Repair record is in a terminal state', { id });
  }
}

export class RepairCompletionMissingDataError extends ApplicationError {
  readonly code = 'REPAIR_COMPLETION_MISSING_DATA';
  constructor(reason: string) {
    super(`Cannot complete repair: ${reason}`, { reason });
  }
}
