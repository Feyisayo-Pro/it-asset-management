import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
} from '../../domain/repositories/assessment.repositories';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import { AssessmentOutcome } from '../../domain/value-objects/assessment-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssessmentCompletedEvent } from '../../domain/events/assessment.events';
import {
  AssessmentNotFoundError,
  AssessmentTemplateNotFoundError,
} from '../../../../common/errors/assessment.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface CompleteAssessmentRecordCommand {
  assessmentId: string;
  outcome: AssessmentOutcome;
  findings: string;
  recommendations?: string | null;
  photoUrls?: string[] | null;
  signatureName: string;
}

@Injectable()
export class CompleteAssessmentRecordUseCase {
  constructor(
    @Inject(ASSESSMENT_RECORD_REPOSITORY)
    private readonly records: AssessmentRecordRepository,
    @Inject(ASSESSMENT_TEMPLATE_REPOSITORY)
    private readonly templates: AssessmentTemplateRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CompleteAssessmentRecordCommand): Promise<AssessmentRecord> {
    const record = await this.records.findById(command.assessmentId);
    if (!record) throw new AssessmentNotFoundError(command.assessmentId);
    const template = await this.templates.findById(record.templateId);
    if (!template) throw new AssessmentTemplateNotFoundError(record.templateId);

    record.complete(
      template,
      {
        outcome: command.outcome,
        findings: command.findings,
        recommendations: command.recommendations,
        photoUrls: command.photoUrls,
        signatureName: command.signatureName,
        signatureIp: asyncContext.get()?.ip ?? null,
      },
      this.clock.now(),
    );
    await this.records.save(record);

    this.events.publish(
      new AssessmentCompletedEvent({
        id: record.id,
        assetId: record.assetId,
        contextType: record.contextType,
        contextId: record.contextId,
        outcome: command.outcome,
        technicianUserId: record.technicianUserId,
      }),
    );
    return record;
  }
}
