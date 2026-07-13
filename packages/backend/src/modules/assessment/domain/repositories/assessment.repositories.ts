import { AssessmentRecord } from '../entities/assessment-record.entity';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { AssessmentContextType } from '../value-objects/assessment-enums';

export const ASSESSMENT_TEMPLATE_REPOSITORY = Symbol('ASSESSMENT_TEMPLATE_REPOSITORY');
export const ASSESSMENT_RECORD_REPOSITORY = Symbol('ASSESSMENT_RECORD_REPOSITORY');

export interface AssessmentTemplateRepository {
  findById(id: string): Promise<AssessmentTemplate | null>;
  findLatestByKey(key: string): Promise<AssessmentTemplate | null>;
  listActive(): Promise<AssessmentTemplate[]>;
}

export interface ListAssessmentsParams {
  page: number;
  pageSize: number;
  assetId?: string;
  status?: string;
  contextType?: AssessmentContextType;
  contextId?: string;
  technicianUserId?: string;
}

export interface ListAssessmentsResult {
  data: AssessmentRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssessmentRecordRepository {
  findById(id: string): Promise<AssessmentRecord | null>;
  list(params: ListAssessmentsParams): Promise<ListAssessmentsResult>;
  save(record: AssessmentRecord): Promise<AssessmentRecord>;
}
