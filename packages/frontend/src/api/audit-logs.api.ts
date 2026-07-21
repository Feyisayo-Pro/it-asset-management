import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface AuditLogDto {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
  occurredAt: string;
}

export interface ListAuditLogsParams {
  page: number;
  pageSize: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const auditLogsApi = {
  list: async (params: ListAuditLogsParams): Promise<PagedResponse<AuditLogDto>> => {
    const { data } = await client.get<PagedResponse<AuditLogDto>>('/audit-logs', { params });
    return data;
  },
  getById: async (id: string): Promise<AuditLogDto> => {
    const { data } = await client.get<AuditLogDto>(`/audit-logs/${id}`);
    return data;
  },
};
