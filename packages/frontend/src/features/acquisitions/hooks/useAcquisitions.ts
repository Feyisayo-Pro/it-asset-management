import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  AcquisitionDto,
  CreateAcquisitionPayload,
  ListAcquisitionsParams,
  UpdateAcquisitionPayload,
  acquisitionsApi,
} from '@/api/acquisitions.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.acquisitions.all });
};

export const useAcquisitions = (params: ListAcquisitionsParams) =>
  useQuery({
    queryKey: queryKeys.acquisitions.list(params as unknown as Record<string, unknown>),
    queryFn: () => acquisitionsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useAcquisition = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.acquisitions.byId(id) : ['acquisitions', 'detail', 'noop'],
    queryFn: () => acquisitionsApi.getById(id as string),
    enabled: !!id,
  });

export const useCreateAcquisition = () => {
  const qc = useQueryClient();
  return useMutation<AcquisitionDto, unknown, CreateAcquisitionPayload>({
    mutationFn: (payload) => acquisitionsApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateAcquisition = (id: string) => {
  const qc = useQueryClient();
  return useMutation<AcquisitionDto, unknown, UpdateAcquisitionPayload>({
    mutationFn: (payload) => acquisitionsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.acquisitions.byId(id), updated);
      invalidate(qc);
    },
  });
};

export const useDeleteAcquisition = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => acquisitionsApi.remove(id),
    onSuccess: () => invalidate(qc),
  });
};
