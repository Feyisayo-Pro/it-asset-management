import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  ListRepairsParams,
  OpenRepairPayload,
  TransitionRepairPayload,
  UpdateRepairPayload,
  repairsApi,
} from '@/api/repairs.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.repairs.all });
  if (id) void qc.invalidateQueries({ queryKey: queryKeys.repairs.byId(id) });
  // A repair transition can flip the asset status — refresh assets too.
  void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
};

export const useRepairs = (params: ListRepairsParams) =>
  useQuery({
    queryKey: queryKeys.repairs.list(params as unknown as Record<string, unknown>),
    queryFn: () => repairsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useRepair = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.repairs.byId(id) : ['repairs', 'detail', 'noop'],
    queryFn: () => repairsApi.getById(id as string),
    enabled: !!id,
  });

export const useRepairsForAsset = (assetId: string | undefined) =>
  useQuery({
    queryKey: assetId ? queryKeys.repairs.byAsset(assetId) : ['repairs', 'by-asset', 'noop'],
    queryFn: () => repairsApi.listForAsset(assetId as string),
    enabled: !!assetId,
  });

export const useOpenRepair = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenRepairPayload) => repairsApi.open(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateRepair = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRepairPayload) => repairsApi.update(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useTransitionRepair = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransitionRepairPayload) => repairsApi.transition(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};
