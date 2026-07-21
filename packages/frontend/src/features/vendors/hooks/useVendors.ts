import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  VendorDto,
  CreateVendorPayload,
  ListVendorsParams,
  UpdateVendorPayload,
  vendorsApi,
} from '@/api/vendors.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.vendors.all });
};

export const useVendors = (params: ListVendorsParams) =>
  useQuery({
    queryKey: queryKeys.vendors.list(params as unknown as Record<string, unknown>),
    queryFn: () => vendorsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useVendor = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.vendors.byId(id) : ['vendors', 'detail', 'noop'],
    queryFn: () => vendorsApi.getById(id as string),
    enabled: !!id,
  });

export const useCreateVendor = () => {
  const qc = useQueryClient();
  return useMutation<VendorDto, unknown, CreateVendorPayload>({
    mutationFn: (payload) => vendorsApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateVendor = (id: string) => {
  const qc = useQueryClient();
  return useMutation<VendorDto, unknown, UpdateVendorPayload>({
    mutationFn: (payload) => vendorsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.vendors.byId(id), updated);
      invalidate(qc);
    },
  });
};

export const useDeleteVendor = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => vendorsApi.remove(id),
    onSuccess: () => invalidate(qc),
  });
};
