import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowInstanceTransition } from '../entities/workflow-transition.entity';

export const WORKFLOW_DEFINITION_REPOSITORY = Symbol('WORKFLOW_DEFINITION_REPOSITORY');
export const WORKFLOW_INSTANCE_REPOSITORY = Symbol('WORKFLOW_INSTANCE_REPOSITORY');

export interface WorkflowDefinitionRepository {
  findById(id: string): Promise<WorkflowDefinition | null>;
  findLatestByKey(key: string): Promise<WorkflowDefinition | null>;
  listAll(): Promise<WorkflowDefinition[]>;
  save(definition: WorkflowDefinition): Promise<WorkflowDefinition>;
}

export interface WorkflowInstanceRepository {
  findById(id: string): Promise<WorkflowInstance | null>;
  findBySubject(subjectType: string, subjectId: string): Promise<WorkflowInstance | null>;
  save(instance: WorkflowInstance): Promise<WorkflowInstance>;
  appendTransition(transition: WorkflowInstanceTransition): Promise<void>;
  listTransitions(instanceId: string): Promise<WorkflowInstanceTransition[]>;
  listPendingForRole(roleName: string): Promise<WorkflowInstance[]>;
}
