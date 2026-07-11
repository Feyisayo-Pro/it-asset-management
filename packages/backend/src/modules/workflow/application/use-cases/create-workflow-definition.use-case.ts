import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WorkflowDefinitionRepository,
} from '../../domain/repositories/workflow.repositories';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import {
  WorkflowDefinition,
  WorkflowStage,
  WorkflowTransitionConfig,
} from '../../domain/entities/workflow-definition.entity';

export interface CreateWorkflowDefinitionCommand {
  key: string;
  name: string;
  description?: string;
  initialState: string;
  finalStates: string[];
  stages: Array<Omit<WorkflowStage, 'id'>>;
  transitions: Array<Omit<WorkflowTransitionConfig, 'id'>>;
}

@Injectable()
export class CreateWorkflowDefinitionUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateWorkflowDefinitionCommand): Promise<WorkflowDefinition> {
    const stages: WorkflowStage[] = command.stages.map((s) => ({
      id: this.ids.next(),
      ...s,
    }));
    const transitions: WorkflowTransitionConfig[] = command.transitions.map((t) => ({
      id: this.ids.next(),
      ...t,
    }));
    const definition = WorkflowDefinition.create({
      id: this.ids.next(),
      key: command.key,
      name: command.name,
      description: command.description,
      initialState: command.initialState,
      finalStates: command.finalStates,
      stages,
      transitions,
      now: this.clock.now(),
    });
    await this.definitions.save(definition);
    return definition;
  }
}
