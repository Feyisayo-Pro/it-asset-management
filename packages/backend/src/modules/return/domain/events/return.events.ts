import { DomainEvent } from '../../../../common/events/base-event';
import { AssessmentOutcome, ReturnReason } from '../value-objects/return-enums';

export class ReturnInitiatedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  reason: ReturnReason;
  initiatedByUserId: string;
}> {
  readonly name = 'return.initiated';
}

export class ReturnItemsRecordedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  itemCount: number;
  missingCount: number;
  damagedCount: number;
}> {
  readonly name = 'return.items-recorded';
}

export class ReturnAssessedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  outcome: AssessmentOutcome;
}> {
  readonly name = 'return.assessed';
}

export class ReturnCompletedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  outcome: AssessmentOutcome | null;
  reason: ReturnReason;
  finalAssetStatus: string;
}> {
  readonly name = 'return.completed';
}

export class ReturnCancelledEvent extends DomainEvent<{
  id: string;
  assetId: string;
}> {
  readonly name = 'return.cancelled';
}
