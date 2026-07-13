import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WORKFLOW_INSTANCE_REPOSITORY,
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
} from '../../domain/repositories/workflow.repositories';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  WorkflowInstanceCreatedEvent,
  WorkflowStageEnteredEvent,
} from '../../domain/events/workflow.events';
import {
  WorkflowAlreadyExistsForSubjectError,
  WorkflowDefinitionNotFoundError,
} from '../../../../common/errors/workflow.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface CreateWorkflowInstanceCommand {
  definitionKey: string;
  subjectType: string;
  subjectId: string;
}

@Injectable()
export class CreateWorkflowInstanceUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instances: WorkflowInstanceRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CreateWorkflowInstanceCommand): Promise<WorkflowInstance> {
    const definition = await this.definitions.findLatestByKey(command.definitionKey);
    if (!definition) throw new WorkflowDefinitionNotFoundError(command.definitionKey);

    const existing = await this.instances.findBySubject(
      command.subjectType,
      command.subjectId,
    );
    if (existing) {
      throw new WorkflowAlreadyExistsForSubjectError(
        command.subjectType,
        command.subjectId,
      );
    }

    const now = this.clock.now();
    const actor = asyncContext.get()?.userId ?? null;
    const instance = WorkflowInstance.start({
      id: this.ids.next(),
      definitionId: definition.id,
      subjectType: command.subjectType,
      subjectId: command.subjectId,
      initialState: definition.initialState,
      startedByUserId: actor,
      now,
    });
    await this.instances.save(instance);

    const initialStage = definition.findStage(definition.initialState);
    this.events.publish(
      new WorkflowInstanceCreatedEvent({
        instanceId: instance.id,
        definitionKey: definition.key,
        subjectType: instance.subjectType,
        subjectId: instance.subjectId,
        initialState: instance.currentState,
        startedByUserId: actor,
      }),
    );
    this.events.publish(
      new WorkflowStageEnteredEvent({
        instanceId: instance.id,
        state: instance.currentState,
        notificationRecipients: initialStage?.requiredRoles ?? [],
      }),
    );

    return instance;
  }
}
