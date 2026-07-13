import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  AdminUserDto,
  CreateUserPayload,
  UpdateUserPayload,
  usersApi,
} from '@/api/users.api';

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.users.all });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation<AdminUserDto, unknown, CreateUserPayload>({
    mutationFn: (payload) => usersApi.create(payload),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation<AdminUserDto, unknown, UpdateUserPayload>({
    mutationFn: (payload) => usersApi.update(id, payload),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.users.byId(id), user);
      invalidateAll(qc);
    },
  });
};

export const useChangeUserRole = (id: string) => {
  const qc = useQueryClient();
  return useMutation<AdminUserDto, unknown, string>({
    mutationFn: (roleId) => usersApi.changeRole(id, roleId),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.users.byId(id), user);
      invalidateAll(qc);
    },
  });
};

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation<AdminUserDto, unknown, string>({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useActivateUser = () => {
  const qc = useQueryClient();
  return useMutation<AdminUserDto, unknown, string>({
    mutationFn: (id) => usersApi.activate(id),
    onSuccess: () => invalidateAll(qc),
  });
};
