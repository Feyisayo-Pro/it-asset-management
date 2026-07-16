import { DomainEvent } from '../../../../common/events/base-event';
import { DisposalMethod, DisposalReason } from '../value-objects/disposal-enums';

export class DisposalRequestedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  requestedByUserId: string;
  reason: DisposalReason;
  method: DisposalMethod;
}> {
  readonly name = 'disposal.requested';
}

export class DisposalApprovedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  approvedByUserId: string;
  witnessUserId: string | null;
  reason: DisposalReason;
  method: DisposalMethod;
  disposalDate: Date;
}> {
  readonly name = 'disposal.approved';
}

export class DisposalRejectedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  approvedByUserId: string;
  rejectionReason: string;
}> {
  readonly name = 'disposal.rejected';
}
