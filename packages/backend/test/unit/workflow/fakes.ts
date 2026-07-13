import {
  WorkflowDefinition,
  WorkflowStage,
  WorkflowTransitionConfig,
} from '../../../src/modules/workflow/domain/entities/workflow-definition.entity';
import { WorkflowInstance } from '../../../src/modules/workflow/domain/entities/workflow-instance.entity';
import { WorkflowInstanceTransition } from '../../../src/modules/workflow/domain/entities/workflow-transition.entity';
import {
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
} from '../../../src/modules/workflow/domain/repositories/workflow.repositories';

export class FakeWorkflowDefinitionRepository implements WorkflowDefinitionRepository {
  private byId = new Map<string, WorkflowDefinition>();

  add(def: WorkflowDefinition): void {
    this.byId.set(def.id, def);
  }
  async findById(id: string): Promise<WorkflowDefinition | null> {
    return this.byId.get(id) ?? null;
  }
  async findLatestByKey(key: string): Promise<WorkflowDefinition | null> {
    let best: WorkflowDefinition | null = null;
    for (const d of this.byId.values()) {
      if (d.key === key && d.isActive && (!best || d.version > best.version)) best = d;
    }
    return best;
  }
  async listAll(): Promise<WorkflowDefinition[]> {
    return Array.from(this.byId.values());
  }
  async save(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
    this.byId.set(definition.id, definition);
    return definition;
  }
}

export class FakeWorkflowInstanceRepository implements WorkflowInstanceRepository {
  private byId = new Map<string, WorkflowInstance>();
  public transitions: WorkflowInstanceTransition[] = [];

  async findById(id: string): Promise<WorkflowInstance | null> {
    return this.byId.get(id) ?? null;
  }
  async findBySubject(subjectType: string, subjectId: string): Promise<WorkflowInstance | null> {
    for (const i of this.byId.values()) {
      if (i.subjectType === subjectType && i.subjectId === subjectId) return i;
    }
    return null;
  }
  async save(instance: WorkflowInstance): Promise<WorkflowInstance> {
    this.byId.set(instance.id, instance);
    return instance;
  }
  async appendTransition(transition: WorkflowInstanceTransition): Promise<void> {
    this.transitions.push(transition);
  }
  async listTransitions(instanceId: string): Promise<WorkflowInstanceTransition[]> {
    return this.transitions.filter((t) => t.instanceId === instanceId);
  }
  async listPendingForRole(): Promise<WorkflowInstance[]> {
    return Array.from(this.byId.values()).filter((i) => !i.isTerminated());
  }
}

/**
 * In-memory copy of the asset-return definition seeded by migration
 * 1720500000000 — kept structurally identical so tests exercise the
 * same graph production runs.
 */
export const buildAssetReturnDefinition = (): WorkflowDefinition => {
  const stages: WorkflowStage[] = [
    { id: 's1', state: 'Initiated', label: 'Return initiated', requiredRoles: ['IT_REP', 'STORES_OFFICER'], slaMinutes: null, sortOrder: 0 },
    { id: 's2', state: 'Assessment', label: 'IT assessment', requiredRoles: ['IT_REP'], slaMinutes: null, sortOrder: 1 },
    { id: 's3', state: 'AwaitingEmployeeSignature', label: 'Employee sign-off', requiredRoles: ['EMPLOYEE'], slaMinutes: null, sortOrder: 2 },
    { id: 's4', state: 'AwaitingItSignature', label: 'IT sign-off', requiredRoles: ['IT_REP'], slaMinutes: null, sortOrder: 3 },
    { id: 's5', state: 'AwaitingPcSignature', label: 'P&C sign-off', requiredRoles: ['PEOPLE_CULTURE'], slaMinutes: null, sortOrder: 4 },
    { id: 's6', state: 'Completed', label: 'Completed', requiredRoles: [], slaMinutes: null, sortOrder: 5 },
    { id: 's7', state: 'Cancelled', label: 'Cancelled', requiredRoles: [], slaMinutes: null, sortOrder: 6 },
  ];
  const transitions: WorkflowTransitionConfig[] = [
    { id: 't1', fromState: 'Initiated', toState: 'Assessment', actionName: 'record-items', requiredRoles: ['IT_REP', 'STORES_OFFICER', 'SUPER_ADMIN'], requiresSignature: false, requiresEvidence: false, requiresComment: false, notificationRecipients: ['IT_REP'], auditAction: 'return.items-recorded' },
    { id: 't2', fromState: 'Assessment', toState: 'AwaitingEmployeeSignature', actionName: 'complete-assessment', requiredRoles: ['IT_REP', 'SUPER_ADMIN'], requiresSignature: false, requiresEvidence: false, requiresComment: true, notificationRecipients: ['EMPLOYEE'], auditAction: 'return.assessed' },
    { id: 't3', fromState: 'AwaitingEmployeeSignature', toState: 'AwaitingItSignature', actionName: 'sign-employee', requiredRoles: ['EMPLOYEE', 'SUPER_ADMIN'], requiresSignature: true, requiresEvidence: false, requiresComment: false, notificationRecipients: ['IT_REP'], auditAction: 'return.signed-employee' },
    { id: 't4', fromState: 'AwaitingItSignature', toState: 'AwaitingPcSignature', actionName: 'sign-it', requiredRoles: ['IT_REP', 'SUPER_ADMIN'], requiresSignature: true, requiresEvidence: false, requiresComment: false, notificationRecipients: ['PEOPLE_CULTURE'], auditAction: 'return.signed-it' },
    { id: 't5', fromState: 'AwaitingPcSignature', toState: 'Completed', actionName: 'sign-pc', requiredRoles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'], requiresSignature: true, requiresEvidence: false, requiresComment: false, notificationRecipients: ['EMPLOYEE', 'STORES_OFFICER'], auditAction: 'return.completed' },
    { id: 't6', fromState: 'Initiated', toState: 'Cancelled', actionName: 'cancel', requiredRoles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'], requiresSignature: false, requiresEvidence: false, requiresComment: true, notificationRecipients: ['EMPLOYEE'], auditAction: 'return.cancelled' },
    { id: 't7', fromState: 'Assessment', toState: 'Cancelled', actionName: 'cancel', requiredRoles: ['PEOPLE_CULTURE', 'SUPER_ADMIN'], requiresSignature: false, requiresEvidence: false, requiresComment: true, notificationRecipients: ['EMPLOYEE'], auditAction: 'return.cancelled' },
  ];
  return WorkflowDefinition.hydrate({
    id: 'def-return',
    key: 'asset-return',
    version: 1,
    name: 'Asset Return',
    description: null,
    isActive: true,
    initialState: 'Initiated',
    finalStates: ['Completed', 'Cancelled'],
    stages,
    transitions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};
