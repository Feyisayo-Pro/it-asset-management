import { DomainEvent } from '../../../../common/events/base-event';
import { RepairStatus } from '../value-objects/repair-enums';

export class RepairOpenedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  reportedFault: string;
  createdByUserId: string;
}> {
  readonly name = 'repair.opened';
}

export class RepairStatusChangedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  from: RepairStatus;
  to: RepairStatus;
  changedByUserId: string;
}> {
  readonly name = 'repair.status-changed';
}

export class RepairCompletedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  outcome: 'Completed' | 'Failed';
  actualCostCents: number | null;
  technicianUserId: string | null;
}> {
  readonly name = 'repair.completed';
}

export class RepairBeyondRepairEvent extends DomainEvent<{
  id: string;
  assetId: string;
  reason: string | null;
}> {
  readonly name = 'repair.beyond-repair';
}
