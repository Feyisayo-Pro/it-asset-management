import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { ListUsersParams, usersApi } from '@/api/users.api';

export const useUsers = (params: ListUsersParams) =>
  useQuery({
    queryKey: queryKeys.users.list(params as unknown as Record<string, unknown>),
    queryFn: () => usersApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.users.byId(id) : ['users', 'detail', 'noop'],
    queryFn: () => usersApi.getById(id as string),
    enabled: !!id,
  });
