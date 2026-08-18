import { client } from './client';
import { env } from '@/config/env';
import { PagedResponse } from '@/types/api';

export interface AssetDto {
  id: string;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  imei: string | null;
  purchaseDate: string | null;
  purchaseAmount: number | null;
  purchaseCurrency: string;
  vendor: string | null;
  warrantyExpiry: string | null;
  officeLocation: string | null;
  department: string | null;
  currentHolderId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  occurredAt: string;
}

export interface ListAssetsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  deviceType?: string;
  brand?: string;
  department?: string;
  officeLocation?: string;
  sortField?: 'assetTag' | 'serialNumber' | 'status' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface CreateAssetPayload {
  assetTag?: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  imei?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  purchaseCurrency?: string;
  vendor?: string | null;
  warrantyExpiry?: string | null;
  officeLocation?: string | null;
  department?: string | null;
  notes?: string | null;
  markAvailableImmediately?: boolean;
}

export type UpdateAssetPayload = Partial<Omit<CreateAssetPayload, 'assetTag' | 'serialNumber'>>;

export interface BulkImportResult {
  dryRun: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    row: number;
    status: 'ok' | 'error';
    assetTag?: string;
    message?: string;
  }>;
}

export const assetsApi = {
  list: async (params: ListAssetsParams): Promise<PagedResponse<AssetDto>> => {
    const { data } = await client.get<PagedResponse<AssetDto>>('/assets', { params });
    return data;
  },
  getById: async (id: string): Promise<AssetDto> => {
    const { data } = await client.get<AssetDto>(`/assets/${id}`);
    return data;
  },
  history: async (id: string): Promise<AssetHistoryEntry[]> => {
    const { data } = await client.get<AssetHistoryEntry[]>(`/assets/${id}/history`);
    return data;
  },
  create: async (payload: CreateAssetPayload): Promise<AssetDto> => {
    const { data } = await client.post<AssetDto>('/assets', payload);
    return data;
  },
  update: async (id: string, payload: UpdateAssetPayload): Promise<AssetDto> => {
    const { data } = await client.patch<AssetDto>(`/assets/${id}`, payload);
    return data;
  },
  changeStatus: async (
    id: string,
    payload: { toStatus: string; reason: string; newHolderId?: string | null },
  ): Promise<AssetDto> => {
    const { data } = await client.patch<AssetDto>(`/assets/${id}/status`, payload);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await client.delete(`/assets/${id}`);
  },
  bulkImport: async (csv: string, dryRun: boolean): Promise<BulkImportResult> => {
    const { data } = await client.post<BulkImportResult>('/assets/import', {
      csv,
      dryRun,
    });
    return data;
  },
  exportUrl: (params: ListAssetsParams): string => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    return `${env.apiBaseUrl}/assets/export?${qs.toString()}`;
  },
  qrUrl: (id: string): string => `${env.apiBaseUrl}/assets/${id}/qr`,
  barcodeUrl: (id: string): string => `${env.apiBaseUrl}/assets/${id}/barcode`,
};
