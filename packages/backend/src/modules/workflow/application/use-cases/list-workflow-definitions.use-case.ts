import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WorkflowDefinitionRepository,
} from '../../domain/repositories/workflow.repositories';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';

@Injectable()
export class ListWorkflowDefinitionsUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
  ) {}
  execute(): Promise<WorkflowDefinition[]> {
    return this.definitions.listAll();
  }
}
