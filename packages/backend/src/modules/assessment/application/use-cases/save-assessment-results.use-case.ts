import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
} from '../../domain/repositories/assessment.repositories';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import { ItemResult } from '../../domain/value-objects/assessment-enums';
import {
  AssessmentNotFoundError,
  AssessmentTemplateNotFoundError,
} from '../../../../common/errors/assessment.errors';

export interface SaveAssessmentResultsCommand {
  assessmentId: string;
  entries: Array<{ itemCode: string; result: ItemResult; note?: string | null }>;
}

@Injectable()
export class SaveAssessmentResultsUseCase {
  constructor(
    @Inject(ASSESSMENT_RECORD_REPOSITORY)
    private readonly records: AssessmentRecordRepository,
    @Inject(ASSESSMENT_TEMPLATE_REPOSITORY)
    private readonly templates: AssessmentTemplateRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SaveAssessmentResultsCommand): Promise<AssessmentRecord> {
    const record = await this.records.findById(command.assessmentId);
    if (!record) throw new AssessmentNotFoundError(command.assessmentId);
    const template = await this.templates.findById(record.templateId);
    if (!template) throw new AssessmentTemplateNotFoundError(record.templateId);

    record.saveResults(
      template,
      command.entries,
      () => this.ids.next(),
      this.clock.now(),
    );
    await this.records.save(record);
    return record;
  }
}
