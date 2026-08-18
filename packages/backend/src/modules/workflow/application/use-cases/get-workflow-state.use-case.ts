import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WORKFLOW_INSTANCE_REPOSITORY,
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
} from '../../domain/repositories/workflow.repositories';
import { WorkflowEngine } from '../../domain/services/workflow-engine';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowInstanceTransition } from '../../domain/entities/workflow-transition.entity';
import {
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
} from '../../../../common/errors/workflow.errors';

@Injectable()
export class GetWorkflowStateUseCase {
  private readonly engine = new WorkflowEngine();

  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instances: WorkflowInstanceRepository,
  ) {}

  async execute(
    instanceId: string,
    actorRole: string,
  ): Promise<{
    instance: WorkflowInstance;
    definition: WorkflowDefinition;
    availableActions: Array<{ actionName: string; toState: string }>;
    history: WorkflowInstanceTransition[];
  }> {
    const instance = await this.instances.findById(instanceId);
    if (!instance) throw new WorkflowInstanceNotFoundError(instanceId);
    const definition = await this.definitions.findById(instance.definitionId);
    if (!definition) throw new WorkflowDefinitionNotFoundError(instance.definitionId);
    const history = await this.instances.listTransitions(instanceId);
    const availableActions = this.engine.availableActions(definition, instance, actorRole);
    return { instance, definition, availableActions, history };
  }
}
