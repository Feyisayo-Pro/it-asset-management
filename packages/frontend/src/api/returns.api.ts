import { client } from './client';
import { PagedResponse } from '@/types/api';
import { WorkflowStageDto } from './workflows.api';

export type ReturnReason =
  | 'Resignation' | 'Termination' | 'Transfer' | 'Replacement'
  | 'Repair' | 'Lost' | 'Other';

export type ReturnItemType =
  | 'Laptop' | 'Phone' | 'Charger' | 'Mouse'
  | 'Dock' | 'Keyboard' | 'Monitor' | 'Other';

export type ReturnItemStatus = 'Returned' | 'Missing' | 'Damaged';

export type AssessmentOutcome =
  | 'Pass' | 'RepairRecommended' | 'ReplacementRecommended' | 'Reject';

export interface ReturnItemDto {
  id: string;
  itemType: ReturnItemType;
  description: string | null;
  status: ReturnItemStatus;
  notes: string | null;
}

export interface ReturnWorkflowDto {
  instanceId: string;
  currentState: string;
  completedAt: string | null;
  availableActions: Array<{ actionName: string; toState: string }>;
  stages: WorkflowStageDto[];
  history: Array<{
    fromState: string;
    toState: string;
    actionName: string;
    actorUserId: string | null;
    signatureName: string | null;
    comment: string | null;
    occurredAt: string;
  }>;
}

export interface ReturnDto {
  id: string;
  assetId: string;
  holderUserId: string | null;
  initiatedByUserId: string;
  reason: ReturnReason;
  reasonNotes: string | null;
  workflowInstanceId: string | null;
  currentState: string;
  findings: string | null;
  damageNotes: string | null;
  missingAccessories: string | null;
  outcome: AssessmentOutcome | null;
  photoUrls: string[] | null;
  items: ReturnItemDto[];
  createdAt: string;
  updatedAt: string;
  workflow?: ReturnWorkflowDto | null;
}

export const returnsApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    state?: string;
    assetId?: string;
  }): Promise<PagedResponse<ReturnDto>> => {
    const { data } = await client.get<PagedResponse<ReturnDto>>('/returns', { params });
    return data;
  },
  getById: async (id: string): Promise<ReturnDto> => {
    const { data } = await client.get<ReturnDto>(`/returns/${id}`);
    return data;
  },
  initiate: async (payload: {
    assetId: string;
    reason: ReturnReason;
    reasonNotes?: string;
  }): Promise<ReturnDto> => {
    const { data } = await client.post<ReturnDto>('/returns', payload);
    return data;
  },
  recordItems: async (
    id: string,
    items: Array<{
      itemType: ReturnItemType;
      description?: string;
      status: ReturnItemStatus;
      notes?: string;
    }>,
  ): Promise<ReturnDto> => {
    const { data } = await client.post<ReturnDto>(`/returns/${id}/items`, { items });
    return data;
  },
  completeAssessment: async (
    id: string,
    payload: {
      findings: string;
      outcome: AssessmentOutcome;
      damageNotes?: string;
      missingAccessories?: string;
      photoUrls?: string[];
    },
  ): Promise<ReturnDto> => {
    const { data } = await client.post<ReturnDto>(`/returns/${id}/assessment`, payload);
    return data;
  },
  sign: async (
    id: string,
    payload: { actionName: 'sign-employee' | 'sign-it' | 'sign-pc'; signatureName: string },
  ): Promise<ReturnDto> => {
    const { data } = await client.post<ReturnDto>(`/returns/${id}/sign`, payload);
    return data;
  },
  cancel: async (id: string, reason: string): Promise<ReturnDto> => {
    const { data } = await client.post<ReturnDto>(`/returns/${id}/cancel`, { reason });
    return data;
  },
};
