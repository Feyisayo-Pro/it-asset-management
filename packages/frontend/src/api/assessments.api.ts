import { client } from './client';
import { PagedResponse } from '@/types/api';

export type ItemResult = 'Pass' | 'Fail' | 'NA';
// Matches DEVICE ASSESSMENT FORM.docx exactly (3 outcomes, no "Reject").
export type AssessmentOutcome =
  | 'NoFaultFound' | 'RepairRecommended' | 'ReplacementRecommended';
export type AssessmentContextType = 'Standalone' | 'Allocation' | 'Return' | 'Repair';
export type ItemCategory = 'Hardware' | 'Software' | 'Condition';

// Mirrors backend HardwareSpecValidator (modules/asset/domain/services/hardware-spec-validator.ts).
export type CpuTier = 'Entry' | 'Standard' | 'Performance';
export const ALL_CPU_TIERS: CpuTier[] = ['Entry', 'Standard', 'Performance'];
export const CPU_TIER_LABELS: Record<CpuTier, string> = {
  Entry: 'Entry (i3 / Ryzen 3)',
  Standard: 'Standard (i5 / Ryzen 5)',
  Performance: 'Performance (i7/i9 / Ryzen 7+)',
};

export type RoleLevel =
  | 'Operative' | 'Officer' | 'SeniorOfficer' | 'AssistantManager' | 'Manager'
  | 'SeniorManager' | 'AssistantGeneralManager' | 'DeputyGeneralManager'
  | 'GeneralManager' | 'Director';
export const ALL_ROLE_LEVELS: RoleLevel[] = [
  'Operative', 'Officer', 'SeniorOfficer', 'AssistantManager', 'Manager',
  'SeniorManager', 'AssistantGeneralManager', 'DeputyGeneralManager',
  'GeneralManager', 'Director',
];
export const ROLE_LEVEL_LABELS: Record<RoleLevel, string> = {
  Operative: 'Operative',
  Officer: 'Officer',
  SeniorOfficer: 'Senior Officer',
  AssistantManager: 'Assistant Manager',
  Manager: 'Manager',
  SeniorManager: 'Senior Manager',
  AssistantGeneralManager: 'Assistant General Manager',
  DeputyGeneralManager: 'Deputy General Manager',
  GeneralManager: 'General Manager',
  Director: 'Director',
};

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
      /**
       * Only consulted server-side when contextType is Allocation — runs
       * HardwareSpecValidator and returns specWarnings. Omit any of these
       * to skip the check; nothing else about completion changes.
       */
      targetRoleLevel?: RoleLevel;
      deviceCpuTier?: CpuTier;
      deviceRamGb?: number;
      deviceStorageGb?: number;
    },
  ): Promise<AssessmentDto & { specWarnings: string[] }> => {
    const { data } = await client.post<AssessmentDto & { specWarnings: string[] }>(
      `/assessments/${id}/complete`,
      payload,
    );
    return data;
  },
};
