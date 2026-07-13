import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { rbacApi } from '@/api/rbac.api';

export const useRoles = () =>
  useQuery({
    queryKey: queryKeys.rbac.roles,
    queryFn: () => rbacApi.listRoles(),
    staleTime: 15 * 60 * 1000,
  });
