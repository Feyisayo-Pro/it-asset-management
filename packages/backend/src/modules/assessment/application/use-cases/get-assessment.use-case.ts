import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
  ListAssessmentsParams,
  ListAssessmentsResult,
} from '../../domain/repositories/assessment.repositories';
import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import { AssessmentTemplate } from '../../domain/entities/assessment-template.entity';
import { ChecklistScorer } from '../../domain/services/checklist-scorer';
import { AssessmentOutcome } from '../../domain/value-objects/assessment-enums';
import {
  AssessmentNotFoundError,
  AssessmentTemplateNotFoundError,
} from '../../../../common/errors/assessment.errors';

@Injectable()
export class GetAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_RECORD_REPOSITORY)
    private readonly records: AssessmentRecordRepository,
    @Inject(ASSESSMENT_TEMPLATE_REPOSITORY)
    private readonly templates: AssessmentTemplateRepository,
  ) {}

  async byId(id: string): Promise<{
    record: AssessmentRecord;
    template: AssessmentTemplate;
    suggestedOutcome: AssessmentOutcome;
  }> {
    const record = await this.records.findById(id);
    if (!record) throw new AssessmentNotFoundError(id);
    const template = await this.templates.findById(record.templateId);
    if (!template) throw new AssessmentTemplateNotFoundError(record.templateId);
    return {
      record,
      template,
      suggestedOutcome: ChecklistScorer.suggest(template, record.results),
    };
  }

  list(params: ListAssessmentsParams): Promise<ListAssessmentsResult> {
    return this.records.list(params);
  }

  async listTemplates(): Promise<AssessmentTemplate[]> {
    return this.templates.listActive();
  }
}
