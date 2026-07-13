import { client } from './client';
import { PagedResponse } from '@/types/api';

export type ItemResult = 'Pass' | 'Fail' | 'NA';
export type AssessmentOutcome =
  | 'Pass' | 'RepairRecommended' | 'ReplacementRecommended' | 'Reject';
export type AssessmentContextType = 'Standalone' | 'Allocation' | 'Return' | 'Repair';
export type ItemCategory = 'Hardware' | 'Software' | 'Condition';

export interface TemplateItemDto {
  code: string;
  label: string;
  category: ItemCategory;
  required: boolean;
  sortOrder: number;
}

export interface TemplateDto {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  items: TemplateItemDto[];
}

export interface AssessmentDto {
  id: string;
  templateId: string;
  assetId: string;
  contextType: AssessmentContextType;
  contextId: string | null;
  status: 'Draft' | 'Completed';
  technicianUserId: string;
  outcome: AssessmentOutcome | null;
  findings: string | null;
  recommendations: string | null;
  photoUrls: string[] | null;
  signatureName: string | null;
  signatureIp: string | null;
  startedAt: string;
  completedAt: string | null;
  results: Array<{ itemCode: string; result: ItemResult; note: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentDetailDto extends AssessmentDto {
  template: TemplateDto;
  suggestedOutcome: AssessmentOutcome;
}

export const assessmentsApi = {
  templates: async (): Promise<TemplateDto[]> => {
    const { data } = await client.get<TemplateDto[]>('/assessments/templates');
    return data;
  },
  list: async (params: {
    page: number;
    pageSize: number;
    status?: 'Draft' | 'Completed';
    assetId?: string;
    contextType?: AssessmentContextType;
  }): Promise<PagedResponse<AssessmentDto>> => {
    const { data } = await client.get<PagedResponse<AssessmentDto>>('/assessments', {
      params,
    });
    return data;
  },
  getById: async (id: string): Promise<AssessmentDetailDto> => {
    const { data } = await client.get<AssessmentDetailDto>(`/assessments/${id}`);
    return data;
  },
  start: async (payload: {
    assetId: string;
    contextType?: AssessmentContextType;
    contextId?: string;
    templateKey?: string;
  }): Promise<AssessmentDto> => {
    const { data } = await client.post<AssessmentDto>('/assessments', payload);
    return data;
  },
  saveResults: async (
    id: string,
    entries: Array<{ itemCode: string; result: ItemResult; note?: string }>,
  ): Promise<AssessmentDto> => {
    const { data } = await client.patch<AssessmentDto>(`/assessments/${id}/results`, {
      entries,
    });
    return data;
  },
  complete: async (
    id: string,
    payload: {
      outcome: AssessmentOutcome;
      findings: string;
      recommendations?: string;
      photoUrls?: string[];
      signatureName: string;
    },
  ): Promise<AssessmentDto> => {
    const { data } = await client.post<AssessmentDto>(
      `/assessments/${id}/complete`,
      payload,
    );
    return data;
  },
};
