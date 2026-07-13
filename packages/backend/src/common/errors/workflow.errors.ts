import { ApplicationError, DomainError } from './domain.error';

export class WorkflowDefinitionNotFoundError extends ApplicationError {
  readonly code = 'WORKFLOW_DEFINITION_NOT_FOUND';
  constructor(idOrKey: string) {
    super('Workflow definition not found', { idOrKey });
  }
}

export class WorkflowInstanceNotFoundError extends ApplicationError {
  readonly code = 'WORKFLOW_INSTANCE_NOT_FOUND';
  constructor(id: string) {
    super('Workflow instance not found', { id });
  }
}

export class WorkflowAlreadyExistsForSubjectError extends ApplicationError {
  readonly code = 'WORKFLOW_ALREADY_EXISTS';
  constructor(subjectType: string, subjectId: string) {
    super('A workflow instance already exists for this subject', {
      subjectType,
      subjectId,
    });
  }
}

export class InvalidTransitionError extends DomainError {
  readonly code = 'INVALID_TRANSITION';
  constructor(action: string, fromState: string) {
    super(`Transition "${action}" is not allowed from state "${fromState}"`, {
      action,
      fromState,
    });
  }
}

export class RoleNotAllowedForTransitionError extends ApplicationError {
  readonly code = 'ROLE_NOT_ALLOWED_FOR_TRANSITION';
  constructor(role: string, action: string) {
    super(`Role "${role}" cannot perform action "${action}"`, {
      role,
      action,
    });
  }
}

export class TransitionRequiresSignatureError extends ApplicationError {
  readonly code = 'TRANSITION_REQUIRES_SIGNATURE';
  constructor(action: string) {
    super(`Action "${action}" requires a signature`, { action });
  }
}

export class TransitionRequiresEvidenceError extends ApplicationError {
  readonly code = 'TRANSITION_REQUIRES_EVIDENCE';
  constructor(action: string) {
    super(`Action "${action}" requires evidence`, { action });
  }
}

export class TransitionRequiresCommentError extends ApplicationError {
  readonly code = 'TRANSITION_REQUIRES_COMMENT';
  constructor(action: string) {
    super(`Action "${action}" requires a comment`, { action });
  }
}

export class WorkflowAlreadyCompletedError extends ApplicationError {
  readonly code = 'WORKFLOW_ALREADY_COMPLETED';
  constructor(instanceId: string) {
    super('Workflow instance is already in a terminal state', { instanceId });
  }
}
