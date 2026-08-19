import { client } from './client';
import { PagedResponse } from '@/types/api';

// Mirrors packages/backend/src/modules/audit/presentation/audit.controller.ts
// (GET /audit-logs, SUPER_ADMIN + audit:read only).
export interface AuditLogEntryDto {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
  occurredAt: string;
}

export const auditApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: string;
    to?: string;
  }): Promise<PagedResponse<AuditLogEntryDto>> => {
    const { data } = await client.get<PagedResponse<AuditLogEntryDto>>('/audit-logs', {
      params,
    });
    return data;
  },
  getById: async (id: string): Promise<AuditLogEntryDto | null> => {
    const { data } = await client.get<AuditLogEntryDto | null>(`/audit-logs/${id}`);
    return data;
  },
};
