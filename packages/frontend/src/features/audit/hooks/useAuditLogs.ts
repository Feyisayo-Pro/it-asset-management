import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { auditApi } from '@/api/audit.api';

export const useAuditLogs = (params: {
  page: number;
  pageSize: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
}) =>
  useQuery({
    queryKey: queryKeys.auditLogs.list(params as unknown as Record<string, unknown>),
    queryFn: () => auditApi.list(params),
    placeholderData: (prev) => prev,
  });
