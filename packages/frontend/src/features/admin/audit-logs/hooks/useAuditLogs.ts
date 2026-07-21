import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { ListAuditLogsParams, auditLogsApi } from '@/api/audit-logs.api';

export const useAuditLogs = (params: ListAuditLogsParams) =>
  useQuery({
    queryKey: queryKeys.auditLogs.list(params as unknown as Record<string, unknown>),
    queryFn: () => auditLogsApi.list(params),
    placeholderData: (prev) => prev,
  });
