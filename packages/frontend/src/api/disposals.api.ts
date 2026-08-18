import { client } from './client';
import { PagedResponse } from '@/types/api';

export type DisposalReason =
  | 'BeyondRepair'
  | 'Obsolete'
  | 'Lost'
  | 'Sold'
  | 'Donated'
  | 'Damaged';

export const DISPOSAL_REASONS: DisposalReason[] = [
  'BeyondRepair',
  'Obsolete',
  'Lost',
  'Sold',
  'Donated',
  'Damaged',
];

export type DisposalMethod =
  | 'EWasteRecycling'
  | 'Sold'
  | 'Donated'
  | 'Destroyed'
  | 'ReturnedToVendor'
  | 'Other';

export const DISPOSAL_METHODS: DisposalMethod[] = [
  'EWasteRecycling',
  'Sold',
  'Donated',
  'Destroyed',
  'ReturnedToVendor',
  'Other',
];

export type DisposalStatus = 'Requested' | 'Approved' | 'Rejected';

export const DISPOSAL_STATUSES: DisposalStatus[] = [
  'Requested',
  'Approved',
  'Rejected',
];

export interface DisposalDto {
  id: string;
  assetId: string;
  requestedByUserId: string;
  approvedByUserId: string | null;
  witnessUserId: string | null;
  reason: DisposalReason;
  method: DisposalMethod;
  status: DisposalStatus;
  requestNotes: string | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  signatureName: string | null;
  signatureIp: string | null;
  evidenceUrls: string[];
  photoUrls: string[];
  disposalDate: string | null;
  requestedAt: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDisposalsParams {
  page: number;
  pageSize: number;
  assetId?: string;
  status?: DisposalStatus;
  requestedByUserId?: string;
  approvedByUserId?: string;
}

export interface RequestDisposalPayload {
  assetId: string;
  reason: DisposalReason;
  method: DisposalMethod;
  requestNotes?: string;
  evidenceUrls?: string[];
  photoUrls?: string[];
}

export interface ApproveDisposalPayload {
  signaturePrintedName: string;
  disposalDate: string;
  witnessUserId?: string;
  approvalNotes?: string;
}

export interface RejectDisposalPayload {
  rejectionReason: string;
}

export const disposalsApi = {
  list: async (params: ListDisposalsParams): Promise<PagedResponse<DisposalDto>> => {
    const { data } = await client.get<PagedResponse<DisposalDto>>('/disposals', { params });
    return data;
  },
  getById: async (id: string): Promise<DisposalDto> => {
    const { data } = await client.get<DisposalDto>(`/disposals/${id}`);
    return data;
  },
  listForAsset: async (assetId: string): Promise<DisposalDto[]> => {
    const { data } = await client.get<DisposalDto[]>(`/disposals/by-asset/${assetId}`);
    return data;
  },
  request: async (payload: RequestDisposalPayload): Promise<DisposalDto> => {
    const { data } = await client.post<DisposalDto>('/disposals', payload);
    return data;
  },
  approve: async (
    id: string,
    payload: ApproveDisposalPayload,
  ): Promise<DisposalDto> => {
    const { data } = await client.post<DisposalDto>(`/disposals/${id}/approve`, payload);
    return data;
  },
  reject: async (id: string, payload: RejectDisposalPayload): Promise<DisposalDto> => {
    const { data } = await client.post<DisposalDto>(`/disposals/${id}/reject`, payload);
    return data;
  },
};
