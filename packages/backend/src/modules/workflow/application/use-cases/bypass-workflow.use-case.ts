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
import { WorkflowInstanceTransition } from '../../domain/entities/workflow-transition.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  WorkflowBypassedEvent,
  WorkflowCompletedEvent,
} from '../../domain/events/workflow.events';
import {
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
  InvalidTransitionError,
} from '../../../../common/errors/workflow.errors';

export interface BypassCommand {
  instanceId: string;
  actorUserId: string;
  reason: string;
  toState: string;
}

/**
 * BypassUseCase — SA-only expedited transition. Skips the state
 * machine's edge check but records the jump as a real
 * WorkflowInstanceTransition with a `bypass` action name so audit
 * and compliance can surface it (arch §8.4, PROJECT_PROMPT §BYPASS).
 */
@Injectable()
export class BypassWorkflowUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepository,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instances: WorkflowInstanceRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: BypassCommand): Promise<WorkflowInstance> {
    const instance = await this.instances.findById(command.instanceId);
    if (!instance) throw new WorkflowInstanceNotFoundError(command.instanceId);
    const definition = await this.definitions.findById(instance.definitionId);
    if (!definition) throw new WorkflowDefinitionNotFoundError(instance.definitionId);
    if (!definition.findStage(command.toState)) {
      throw new InvalidTransitionError(`bypass:${command.toState}`, instance.currentState);
    }

    const now = this.clock.now();
    const fromState = instance.currentState;
    const isFinal = definition.isFinalState(command.toState);

    instance.moveTo(command.toState, now, isFinal);
    instance.markBypassed(command.actorUserId, command.reason, now);
    await this.instances.save(instance);

    await this.instances.appendTransition(
      WorkflowInstanceTransition.record({
        id: this.ids.next(),
        instanceId: instance.id,
        fromState,
        toState: command.toState,
        actionName: 'bypass',
        actorUserId: command.actorUserId,
        signatureName: null,
        signatureIp: null,
        evidenceFileIds: null,
        comment: command.reason,
        occurredAt: now,
      }),
    );

    this.events.publish(
      new WorkflowBypassedEvent({
        instanceId: instance.id,
        bypassedByUserId: command.actorUserId,
        reason: command.reason,
        fromState,
        toState: command.toState,
      }),
    );
    if (isFinal) {
      this.events.publish(
        new WorkflowCompletedEvent({
          instanceId: instance.id,
          finalState: command.toState,
        }),
      );
    }

    return instance;
  }
}
