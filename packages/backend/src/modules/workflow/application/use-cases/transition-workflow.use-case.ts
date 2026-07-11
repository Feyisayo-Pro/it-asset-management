import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WORKFLOW_INSTANCE_REPOSITORY,
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
} from '../../domain/repositories/workflow.repositories';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { WorkflowEngine } from '../../domain/services/workflow-engine';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import { WorkflowInstanceTransition } from '../../domain/entities/workflow-transition.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  WorkflowStageCompletedEvent,
  WorkflowStageEnteredEvent,
  WorkflowCompletedEvent,
} from '../../domain/events/workflow.events';
import {
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
} from '../../../../common/errors/workflow.errors';

export interface TransitionCommand {
  instanceId: string;
  actionName: string;
  actorUserId: string;
  actorRole: string;
  signatureName?: string;
  signatureIp?: string;
  evidenceFileIds?: string[];
  comment?: string;
}

@Injectable()
export class TransitionWorkflowUseCase {
  private readonly engine = new WorkflowEngine();

  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instances: WorkflowInstanceRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: TransitionCommand): Promise<WorkflowInstance> {
    const instance = await this.instances.findById(command.instanceId);
    if (!instance) throw new WorkflowInstanceNotFoundError(command.instanceId);
    const definition = await this.definitions.findById(instance.definitionId);
    if (!definition) throw new WorkflowDefinitionNotFoundError(instance.definitionId);

    const decision = this.engine.evaluate(definition, instance, {
      action: command.actionName,
      actorRole: command.actorRole,
      actorUserId: command.actorUserId,
      signatureName: command.signatureName ?? null,
      signatureIp: command.signatureIp ?? null,
      evidenceFileIds: command.evidenceFileIds ?? null,
      comment: command.comment ?? null,
    });

    const now = this.clock.now();
    const fromState = instance.currentState;

    instance.moveTo(decision.toState, now, decision.isFinal);
    await this.instances.save(instance);

    const transitionRecord = WorkflowInstanceTransition.record({
      id: this.ids.next(),
      instanceId: instance.id,
      fromState: decision.fromState,
      toState: decision.toState,
      actionName: decision.actionName,
      actorUserId: command.actorUserId,
      signatureName: command.signatureName ?? null,
      signatureIp: command.signatureIp ?? null,
      evidenceFileIds: command.evidenceFileIds ?? null,
      comment: command.comment ?? null,
      occurredAt: now,
    });
    await this.instances.appendTransition(transitionRecord);

    this.events.publish(
      new WorkflowStageCompletedEvent({
        instanceId: instance.id,
        fromState,
        actionName: decision.actionName,
        actorUserId: command.actorUserId,
        actorRole: command.actorRole,
      }),
    );

    if (decision.isFinal) {
      this.events.publish(
        new WorkflowCompletedEvent({
          instanceId: instance.id,
          finalState: decision.toState,
        }),
      );
    } else {
      this.events.publish(
        new WorkflowStageEnteredEvent({
          instanceId: instance.id,
          state: decision.toState,
          notificationRecipients: decision.notificationRecipients,
        }),
      );
    }

    return instance;
  }
}
