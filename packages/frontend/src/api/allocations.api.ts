import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface AllocationDto {
  id: string;
  employeeId: string;
  employeeName: string | null;
  assetId: string | null;
  assetTag: string | null;
  workflowInstanceId: string | null;
  currentState: string;
  justification: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationWorkflowDto {
  currentState: string;
  completedAt: string | null;
  bypassed: boolean;
  availableActions: Array<{ actionName: string; toState: string }>;
  stages: Array<{ state: string; label: string; sortOrder: number }>;
  history: Array<{
    id: string;
    fromState: string;
    toState: string;
    actionName: string;
    actorUserId: string | null;
    signatureName: string | null;
    comment: string | null;
    occurredAt: string;
  }>;
}

export interface AllocationDetailResponse {
  allocation: AllocationDto;
  workflow: AllocationWorkflowDto | null;
}

export interface ListAllocationsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface CreateAllocationPayload {
  employeeId: string;
  justification?: string | null;
}

export const allocationsApi = {
  list: async (params: ListAllocationsParams): Promise<PagedResponse<AllocationDto>> => {
    const { data } = await client.get<PagedResponse<AllocationDto>>('/allocations', { params });
    return data;
  },
  getById: async (id: string): Promise<AllocationDetailResponse> => {
    const { data } = await client.get<AllocationDetailResponse>(`/allocations/${id}`);
    return data;
  },
  create: async (payload: CreateAllocationPayload): Promise<AllocationDto> => {
    const { data } = await client.post<AllocationDto>('/allocations', payload);
    return data;
  },
  assignAsset: async (id: string, assetId: string): Promise<void> => {
    await client.patch(`/allocations/${id}/assign-asset`, { assetId });
  },
  transition: async (
    id: string,
    payload: { actionName: string; signatureName?: string; comment?: string },
  ): Promise<AllocationDto> => {
    const { data } = await client.post<AllocationDto>(`/allocations/${id}/transition`, payload);
    return data;
  },
};
