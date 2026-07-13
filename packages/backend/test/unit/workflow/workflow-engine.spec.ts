import {
  WorkflowDefinition,
  WorkflowStage,
  WorkflowTransitionConfig,
} from '../../../src/modules/workflow/domain/entities/workflow-definition.entity';
import { WorkflowInstance } from '../../../src/modules/workflow/domain/entities/workflow-instance.entity';
import { WorkflowEngine } from '../../../src/modules/workflow/domain/services/workflow-engine';
import {
  InvalidTransitionError,
  RoleNotAllowedForTransitionError,
  TransitionRequiresCommentError,
  TransitionRequiresEvidenceError,
  TransitionRequiresSignatureError,
  WorkflowAlreadyCompletedError,
} from '../../../src/common/errors/workflow.errors';

const stages: WorkflowStage[] = [
  { id: 's1', state: 'Requested', label: 'Requested', requiredRoles: ['EMPLOYEE'], slaMinutes: null, sortOrder: 0 },
  { id: 's2', state: 'Approved', label: 'Approved', requiredRoles: ['PC'], slaMinutes: null, sortOrder: 1 },
  { id: 's3', state: 'Signed', label: 'Signed', requiredRoles: ['EMPLOYEE'], slaMinutes: null, sortOrder: 2 },
  { id: 's4', state: 'Completed', label: 'Completed', requiredRoles: [], slaMinutes: null, sortOrder: 3 },
];

const transitions: WorkflowTransitionConfig[] = [
  {
    id: 't1', fromState: 'Requested', toState: 'Approved', actionName: 'approve',
    requiredRoles: ['PC'], requiresSignature: false, requiresEvidence: false,
    requiresComment: false, notificationRecipients: ['EMPLOYEE'],
    auditAction: 'allocation.approved',
  },
  {
    id: 't2', fromState: 'Approved', toState: 'Signed', actionName: 'sign',
    requiredRoles: ['EMPLOYEE'], requiresSignature: true, requiresEvidence: false,
    requiresComment: false, notificationRecipients: ['PC'],
    auditAction: 'allocation.signed',
  },
  {
    id: 't3', fromState: 'Signed', toState: 'Completed', actionName: 'complete',
    requiredRoles: ['PC'], requiresSignature: false, requiresEvidence: true,
    requiresComment: true, notificationRecipients: [],
    auditAction: 'allocation.completed',
  },
];

const buildDef = () =>
  WorkflowDefinition.hydrate({
    id: 'def-1', key: 'allocation', version: 1, name: 'Allocation',
    description: null, isActive: true,
    initialState: 'Requested', finalStates: ['Completed'],
    stages, transitions,
    createdAt: new Date(), updatedAt: new Date(),
  });

const buildInstance = (currentState = 'Requested') =>
  WorkflowInstance.hydrate({
    id: 'i-1', definitionId: 'def-1',
    subjectType: 'AllocationRequest', subjectId: 'x',
    currentState,
    startedByUserId: 'u1', startedAt: new Date(),
    currentStageEnteredAt: new Date(),
    completedAt: null, bypassed: false,
    bypassedByUserId: null, bypassReason: null,
    createdAt: new Date(), updatedAt: new Date(),
  });

describe('WorkflowEngine', () => {
  const engine = new WorkflowEngine();

  it('accepts a legal transition and returns metadata', () => {
    const decision = engine.evaluate(buildDef(), buildInstance(), {
      action: 'approve', actorRole: 'PC', actorUserId: 'u1',
    });
    expect(decision.toState).toBe('Approved');
    expect(decision.isFinal).toBe(false);
    expect(decision.auditAction).toBe('allocation.approved');
    expect(decision.notificationRecipients).toEqual(['EMPLOYEE']);
  });

  it('flags final-state transitions', () => {
    const inst = buildInstance('Signed');
    const decision = engine.evaluate(buildDef(), inst, {
      action: 'complete', actorRole: 'PC', actorUserId: 'u1',
      evidenceFileIds: ['file-1'], comment: 'ok',
    });
    expect(decision.isFinal).toBe(true);
  });

  it('rejects an action with no matching transition', () => {
    expect(() =>
      engine.evaluate(buildDef(), buildInstance(), {
        action: 'nope', actorRole: 'PC', actorUserId: 'u1',
      }),
    ).toThrow(InvalidTransitionError);
  });

  it('rejects an action performed by a role not in the requiredRoles list', () => {
    expect(() =>
      engine.evaluate(buildDef(), buildInstance(), {
        action: 'approve', actorRole: 'EMPLOYEE', actorUserId: 'u1',
      }),
    ).toThrow(RoleNotAllowedForTransitionError);
  });

  it('rejects a signature-required action without signature', () => {
    expect(() =>
      engine.evaluate(buildDef(), buildInstance('Approved'), {
        action: 'sign', actorRole: 'EMPLOYEE', actorUserId: 'u1',
      }),
    ).toThrow(TransitionRequiresSignatureError);
  });

  it('rejects an evidence-required action without evidence', () => {
    expect(() =>
      engine.evaluate(buildDef(), buildInstance('Signed'), {
        action: 'complete', actorRole: 'PC', actorUserId: 'u1',
        comment: 'ok',
      }),
    ).toThrow(TransitionRequiresEvidenceError);
  });

  it('rejects a comment-required action without a comment', () => {
    expect(() =>
      engine.evaluate(buildDef(), buildInstance('Signed'), {
        action: 'complete', actorRole: 'PC', actorUserId: 'u1',
        evidenceFileIds: ['file-1'],
      }),
    ).toThrow(TransitionRequiresCommentError);
  });

  it('rejects any action on an already-completed instance', () => {
    const inst = buildInstance('Completed');
    (inst as unknown as { props: { completedAt: Date | null } }).props.completedAt = new Date();
    expect(() =>
      engine.evaluate(buildDef(), inst, {
        action: 'approve', actorRole: 'PC', actorUserId: 'u1',
      }),
    ).toThrow(WorkflowAlreadyCompletedError);
  });

  it('availableActions filters transitions the caller cannot execute', () => {
    const actions = engine.availableActions(buildDef(), buildInstance(), 'EMPLOYEE');
    expect(actions).toEqual([]);
    const asPc = engine.availableActions(buildDef(), buildInstance(), 'PC');
    expect(asPc.map((a) => a.actionName)).toEqual(['approve']);
  });
});
