import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  AllocationDto,
  CreateAllocationPayload,
  ListAllocationsParams,
  allocationsApi,
} from '@/api/allocations.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.allocations.all });
};

export const useAllocations = (params: ListAllocationsParams) =>
  useQuery({
    queryKey: queryKeys.allocations.list(params as unknown as Record<string, unknown>),
    queryFn: () => allocationsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useAllocation = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.allocations.byId(id) : ['allocations', 'detail', 'noop'],
    queryFn: () => allocationsApi.getById(id as string),
    enabled: !!id,
  });

export const useCreateAllocation = () => {
  const qc = useQueryClient();
  return useMutation<AllocationDto, unknown, CreateAllocationPayload>({
    mutationFn: (payload) => allocationsApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useAssignAsset = (allocationId: string) => {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (assetId) => allocationsApi.assignAsset(allocationId, assetId),
    onSuccess: () => {
      invalidate(qc);
      void qc.invalidateQueries({ queryKey: queryKeys.allocations.byId(allocationId) });
    },
  });
};

export const useTransitionAllocation = (allocationId: string) => {
  const qc = useQueryClient();
  return useMutation<
    AllocationDto,
    unknown,
    { actionName: string; signatureName?: string; comment?: string }
  >({
    mutationFn: (payload) => allocationsApi.transition(allocationId, payload),
    onSuccess: () => {
      invalidate(qc);
      void qc.invalidateQueries({ queryKey: queryKeys.allocations.byId(allocationId) });
    },
  });
};
