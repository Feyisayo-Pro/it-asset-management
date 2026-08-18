import { DomainEvent } from '../../../../common/events/base-event';
import {
  AssessmentContextType,
  AssessmentOutcome,
} from '../value-objects/assessment-enums';

export class AssessmentStartedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  contextType: AssessmentContextType;
  contextId: string | null;
  technicianUserId: string;
}> {
  readonly name = 'assessment.started';
}

/**
 * The reusability hook: consuming modules (Allocation, Return, Repair,
 * future inspections) subscribe and filter on contextType/contextId to
 * route their own follow-on actions from the outcome.
 */
export class AssessmentCompletedEvent extends DomainEvent<{
  id: string;
  assetId: string;
  contextType: AssessmentContextType;
  contextId: string | null;
  outcome: AssessmentOutcome;
  technicianUserId: string;
}> {
  readonly name = 'assessment.completed';
}
