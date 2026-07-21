import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface VendorDto {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListVendorsParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface CreateVendorPayload {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
}

export type UpdateVendorPayload = Partial<CreateVendorPayload> & { isActive?: boolean };

export const vendorsApi = {
  list: async (params: ListVendorsParams): Promise<PagedResponse<VendorDto>> => {
    const { data } = await client.get<PagedResponse<VendorDto>>('/vendors', { params });
    return data;
  },
  getById: async (id: string): Promise<VendorDto> => {
    const { data } = await client.get<VendorDto>(`/vendors/${id}`);
    return data;
  },
  create: async (payload: CreateVendorPayload): Promise<VendorDto> => {
    const { data } = await client.post<VendorDto>('/vendors', payload);
    return data;
  },
  update: async (id: string, payload: UpdateVendorPayload): Promise<VendorDto> => {
    const { data } = await client.patch<VendorDto>(`/vendors/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await client.delete(`/vendors/${id}`);
  },
};
