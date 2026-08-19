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

// Mirrors backend ROLE_LEVEL_SPEC_REQUIREMENTS (hardware-spec-validator.ts)
// for instant client-side feedback while filling the completion form —
// the backend re-validates and is the actual enforcement point.
const CPU_TIER_RANK: Record<CpuTier, number> = { Entry: 0, Standard: 1, Performance: 2 };
interface RoleLevelSpecRequirement {
  minCpuTier: CpuTier;
  minRamGb: number;
  minStorageGb: number;
}
export const ROLE_LEVEL_SPEC_REQUIREMENTS: Record<RoleLevel, RoleLevelSpecRequirement | null> = {
  Operative: { minCpuTier: 'Entry', minRamGb: 8, minStorageGb: 256 },
  Officer: { minCpuTier: 'Standard', minRamGb: 8, minStorageGb: 256 },
  SeniorOfficer: { minCpuTier: 'Standard', minRamGb: 8, minStorageGb: 256 },
  AssistantManager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 },
  Manager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 },
  SeniorManager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 },
  AssistantGeneralManager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 },
  DeputyGeneralManager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 },
  GeneralManager: { minCpuTier: 'Performance', minRamGb: 16, minStorageGb: 512 },
  Director: null,
};

export function evaluateSpec(
  roleLevel: RoleLevel,
  spec: { cpuTier: CpuTier; ramGb: number; storageGb: number },
): string[] {
  const requirement = ROLE_LEVEL_SPEC_REQUIREMENTS[roleLevel];
  if (!requirement) return [];
  const warnings: string[] = [];
  if (CPU_TIER_RANK[spec.cpuTier] < CPU_TIER_RANK[requirement.minCpuTier]) {
    warnings.push(
      `Selected device's CPU tier (${spec.cpuTier}) is below the ${roleLevel} role level's minimum (${requirement.minCpuTier}).`,
    );
  }
  if (spec.ramGb < requirement.minRamGb) {
    warnings.push(
      `Selected device has ${spec.ramGb}GB RAM, below the ${roleLevel} role level's minimum of ${requirement.minRamGb}GB.`,
    );
  }
  if (spec.storageGb < requirement.minStorageGb) {
    warnings.push(
      `Selected device has ${spec.storageGb}GB storage, below the ${roleLevel} role level's minimum of ${requirement.minStorageGb}GB.`,
    );
  }
  return warnings;
}

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
  specNonComplianceOverride: boolean;
  specOverrideJustification: string | null;
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
      /** Required to proceed when the device is below the target role
       *  level's minimum — see evaluateSpec(). */
      specNonComplianceOverride?: boolean;
      specOverrideJustification?: string;
    },
  ): Promise<AssessmentDto & { specWarnings: string[] }> => {
    const { data } = await client.post<AssessmentDto & { specWarnings: string[] }>(
      `/assessments/${id}/complete`,
      payload,
    );
    return data;
  },
};
