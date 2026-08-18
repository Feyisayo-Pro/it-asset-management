import { client } from './client';
import { PagedResponse } from '@/types/api';

export type RepairStatus =
  | 'Pending'
  | 'Diagnosing'
  | 'AwaitingParts'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'BeyondRepair';

export const REPAIR_STATUSES: RepairStatus[] = [
  'Pending',
  'Diagnosing',
  'AwaitingParts',
  'InProgress',
  'Completed',
  'Failed',
  'BeyondRepair',
];

export interface RepairHistoryDto {
  id: string;
  fromStatus: RepairStatus | null;
  toStatus: RepairStatus;
  changedByUserId: string;
  note: string | null;
  occurredAt: string;
}

export interface RepairDto {
  id: string;
  assetId: string;
  employeeUserId: string | null;
  technicianUserId: string | null;
  vendor: string | null;
  reportedFault: string;
  diagnosis: string | null;
  resolutionNotes: string | null;
  status: RepairStatus;
  estimatedCost: number | null;
  actualCost: number | null;
  costCurrency: string;
  warrantyActiveAtIntake: boolean | null;
  reportedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  history?: RepairHistoryDto[];
}

export interface ListRepairsParams {
  page: number;
  pageSize: number;
  assetId?: string;
  status?: RepairStatus;
  technicianUserId?: string;
}

export interface OpenRepairPayload {
  assetId: string;
  reportedFault: string;
  employeeUserId?: string;
  technicianUserId?: string;
  vendor?: string;
  estimatedCost?: number;
  costCurrency?: string;
}

export interface UpdateRepairPayload {
  technicianUserId?: string | null;
  vendor?: string | null;
  estimatedCost?: number | null;
}

export interface TransitionRepairPayload {
  toStatus: RepairStatus;
  diagnosis?: string;
  resolutionNotes?: string;
  actualCost?: number;
  note?: string;
}

export const repairsApi = {
  list: async (params: ListRepairsParams): Promise<PagedResponse<RepairDto>> => {
    const { data } = await client.get<PagedResponse<RepairDto>>('/repairs', { params });
    return data;
  },
  getById: async (id: string): Promise<RepairDto> => {
    const { data } = await client.get<RepairDto>(`/repairs/${id}`);
    return data;
  },
  listForAsset: async (assetId: string): Promise<RepairDto[]> => {
    const { data } = await client.get<RepairDto[]>(`/repairs/by-asset/${assetId}`);
    return data;
  },
  open: async (payload: OpenRepairPayload): Promise<RepairDto> => {
    const { data } = await client.post<RepairDto>('/repairs', payload);
    return data;
  },
  update: async (id: string, payload: UpdateRepairPayload): Promise<RepairDto> => {
    const { data } = await client.patch<RepairDto>(`/repairs/${id}`, payload);
    return data;
  },
  transition: async (
    id: string,
    payload: TransitionRepairPayload,
  ): Promise<RepairDto> => {
    const { data } = await client.post<RepairDto>(`/repairs/${id}/transition`, payload);
    return data;
  },
};
