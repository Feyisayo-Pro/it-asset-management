import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import {
  InvalidTransitionError,
  RoleNotAllowedForTransitionError,
  TransitionRequiresCommentError,
  TransitionRequiresEvidenceError,
  TransitionRequiresSignatureError,
  WorkflowAlreadyCompletedError,
} from '../../../../common/errors/workflow.errors';

export interface TransitionInput {
  action: string;
  actorRole: string;
  actorUserId: string | null;
  signatureName?: string | null;
  signatureIp?: string | null;
  evidenceFileIds?: string[] | null;
  comment?: string | null;
}

export interface TransitionResult {
  fromState: string;
  toState: string;
  actionName: string;
  isFinal: boolean;
  auditAction: string;
  notificationRecipients: string[];
}

/**
 * WorkflowEngine — pure state machine evaluator. Given a definition
 * and an instance's current state, plus a proposed action, it either
 * returns the target state (and side-effect metadata) or throws a
 * typed rejection. It has zero I/O — persistence, event emission,
 * notification dispatch are the caller's responsibility (in
 * TransitionUseCase).
 *
 * This is what the "reusable, configurable workflow engine" contract
 * from PROJECT_PROMPT.md §WORKFLOW ENGINE and arch §8 comes down to:
 * every business workflow (allocation, return, assessment routing,
 * repair, disposal) is a definition + instance pair against this
 * engine — no hardcoded workflow logic.
 */
export class WorkflowEngine {
  evaluate(
    definition: WorkflowDefinition,
    instance: WorkflowInstance,
    input: TransitionInput,
  ): TransitionResult {
    if (instance.isTerminated()) {
      throw new WorkflowAlreadyCompletedError(instance.id);
    }
    const transition = definition.findTransition(instance.currentState, input.action);
    if (!transition) {
      throw new InvalidTransitionError(input.action, instance.currentState);
    }
    if (
      transition.requiredRoles.length > 0 &&
      !transition.requiredRoles.includes(input.actorRole)
    ) {
      throw new RoleNotAllowedForTransitionError(input.actorRole, input.action);
    }
    if (transition.requiresSignature && !input.signatureName?.trim()) {
      throw new TransitionRequiresSignatureError(input.action);
    }
    if (
      transition.requiresEvidence &&
      (!input.evidenceFileIds || input.evidenceFileIds.length === 0)
    ) {
      throw new TransitionRequiresEvidenceError(input.action);
    }
    if (transition.requiresComment && !input.comment?.trim()) {
      throw new TransitionRequiresCommentError(input.action);
    }
    return {
      fromState: instance.currentState,
      toState: transition.toState,
      actionName: transition.actionName,
      isFinal: definition.isFinalState(transition.toState),
      auditAction: transition.auditAction,
      notificationRecipients: transition.notificationRecipients,
    };
  }

  /**
   * Returns the actions a caller with the given role could take from
   * this instance's current state. Used by the FE to render the
   * WorkflowActionBar.
   */
  availableActions(
    definition: WorkflowDefinition,
    instance: WorkflowInstance,
    actorRole: string,
  ): Array<{ actionName: string; toState: string }> {
    if (instance.isTerminated()) return [];
    return definition.transitions
      .filter(
        (t) =>
          t.fromState === instance.currentState &&
          (t.requiredRoles.length === 0 || t.requiredRoles.includes(actorRole)),
      )
      .map((t) => ({ actionName: t.actionName, toState: t.toState }));
  }
}
