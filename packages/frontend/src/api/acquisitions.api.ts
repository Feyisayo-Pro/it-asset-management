import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface AcquisitionDto {
  id: string;
  vendorId: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
  purchaseDate: string | null;
  warrantyMonths: number | null;
  unitCostCents: number | null;
  currency: string;
  quantity: number;
  notes: string | null;
  createdBy: string | null;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListAcquisitionsParams {
  page: number;
  pageSize: number;
  search?: string;
  vendorId?: string;
}

export interface CreateAcquisitionPayload {
  vendorId?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  warrantyMonths?: number | null;
  unitCostCents?: number | null;
  currency?: string;
  quantity?: number;
  notes?: string | null;
  assetIds?: string[];
}

export type UpdateAcquisitionPayload = CreateAcquisitionPayload;

export const acquisitionsApi = {
  list: async (params: ListAcquisitionsParams): Promise<PagedResponse<AcquisitionDto>> => {
    const { data } = await client.get<PagedResponse<AcquisitionDto>>('/acquisitions', { params });
    return data;
  },
  getById: async (id: string): Promise<AcquisitionDto> => {
    const { data } = await client.get<AcquisitionDto>(`/acquisitions/${id}`);
    return data;
  },
  create: async (payload: CreateAcquisitionPayload): Promise<AcquisitionDto> => {
    const { data } = await client.post<AcquisitionDto>('/acquisitions', payload);
    return data;
  },
  update: async (id: string, payload: UpdateAcquisitionPayload): Promise<AcquisitionDto> => {
    const { data } = await client.patch<AcquisitionDto>(`/acquisitions/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await client.delete(`/acquisitions/${id}`);
  },
};
