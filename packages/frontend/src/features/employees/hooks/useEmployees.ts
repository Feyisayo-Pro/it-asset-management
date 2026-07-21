import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  EmployeeDto,
  CreateEmployeePayload,
  ListEmployeesParams,
  UpdateEmployeePayload,
  employeesApi,
} from '@/api/employees.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.employees.all });
};

export const useEmployees = (params: ListEmployeesParams) =>
  useQuery({
    queryKey: queryKeys.employees.list(params as unknown as Record<string, unknown>),
    queryFn: () => employeesApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useEmployee = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.employees.byId(id) : ['employees', 'detail', 'noop'],
    queryFn: () => employeesApi.getById(id as string),
    enabled: !!id,
  });

export const useEmployeeAssets = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.employees.assets(id) : ['employees', 'assets', 'noop'],
    queryFn: () => employeesApi.getAssignedAssets(id as string),
    enabled: !!id,
  });

export const useEmployeeHistory = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.employees.history(id) : ['employees', 'history', 'noop'],
    queryFn: () => employeesApi.getAssetHistory(id as string),
    enabled: !!id,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation<EmployeeDto, unknown, CreateEmployeePayload>({
    mutationFn: (payload) => employeesApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateEmployee = (id: string) => {
  const qc = useQueryClient();
  return useMutation<EmployeeDto, unknown, UpdateEmployeePayload>({
    mutationFn: (payload) => employeesApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.employees.byId(id), updated);
      invalidate(qc);
    },
  });
};

export const useChangeEmploymentStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation<
    EmployeeDto,
    unknown,
    { status: string; terminationDate?: string | null }
  >({
    mutationFn: (payload) => employeesApi.changeStatus(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.employees.byId(id), updated);
      invalidate(qc);
    },
  });
};
