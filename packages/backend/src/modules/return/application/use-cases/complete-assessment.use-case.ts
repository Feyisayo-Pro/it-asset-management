import { Inject, Injectable } from '@nestjs/common';
import {
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { TransitionWorkflowUseCase } from '../../../workflow/application/use-cases/transition-workflow.use-case';
import { ReturnRecord } from '../../domain/entities/return-record.entity';
import { AssessmentOutcome } from '../../domain/value-objects/return-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { ReturnAssessedEvent } from '../../domain/events/return.events';
import { ReturnNotFoundError } from '../../../../common/errors/return.errors';

export interface CompleteAssessmentCommand {
  returnId: string;
  actorUserId: string;
  actorRole: string;
  findings: string;
  outcome: AssessmentOutcome;
  damageNotes?: string | null;
  missingAccessories?: string | null;
  photoUrls?: string[] | null;
}

@Injectable()
export class CompleteAssessmentUseCase {
  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly transition: TransitionWorkflowUseCase,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CompleteAssessmentCommand): Promise<ReturnRecord> {
    const record = await this.returns.findById(command.returnId);
    if (!record || !record.workflowInstanceId) {
      throw new ReturnNotFoundError(command.returnId);
    }

    const now = this.clock.now();
    record.recordAssessment(
      {
        findings: command.findings,
        outcome: command.outcome,
        damageNotes: command.damageNotes,
        missingAccessories: command.missingAccessories,
        photoUrls: command.photoUrls,
      },
      now,
    );
    await this.returns.save(record);

    const instance = await this.transition.execute({
      instanceId: record.workflowInstanceId,
      actionName: 'complete-assessment',
      actorUserId: command.actorUserId,
      actorRole: command.actorRole,
      comment: command.findings,
    });
    record.syncState(instance.currentState, now);
    await this.returns.save(record);

    this.events.publish(
      new ReturnAssessedEvent({
        id: record.id,
        assetId: record.assetId,
        outcome: command.outcome,
      }),
    );

    return record;
  }
}
