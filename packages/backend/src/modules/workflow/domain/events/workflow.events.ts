import { DomainEvent } from '../../../../common/events/base-event';

export class WorkflowInstanceCreatedEvent extends DomainEvent<{
  instanceId: string;
  definitionKey: string;
  subjectType: string;
  subjectId: string;
  initialState: string;
  startedByUserId: string | null;
}> {
  readonly name = 'workflow.instance.created';
}

export class WorkflowStageEnteredEvent extends DomainEvent<{
  instanceId: string;
  state: string;
  notificationRecipients: string[];
}> {
  readonly name = 'workflow.stage.entered';
}

export class WorkflowStageCompletedEvent extends DomainEvent<{
  instanceId: string;
  fromState: string;
  actionName: string;
  actorUserId: string | null;
  actorRole: string;
}> {
  readonly name = 'workflow.stage.completed';
}

export class WorkflowCompletedEvent extends DomainEvent<{
  instanceId: string;
  finalState: string;
}> {
  readonly name = 'workflow.completed';
}

export class WorkflowBypassedEvent extends DomainEvent<{
  instanceId: string;
  bypassedByUserId: string;
  reason: string;
  fromState: string;
  toState: string;
}> {
  readonly name = 'workflow.bypassed';
}
