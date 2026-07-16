import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  ApproveDisposalPayload,
  ListDisposalsParams,
  RejectDisposalPayload,
  RequestDisposalPayload,
  disposalsApi,
} from '@/api/disposals.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.disposals.all });
  if (id) void qc.invalidateQueries({ queryKey: queryKeys.disposals.byId(id) });
  // Approval flips the asset to Disposed — refresh asset caches too.
  void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
};

export const useDisposals = (params: ListDisposalsParams) =>
  useQuery({
    queryKey: queryKeys.disposals.list(params as unknown as Record<string, unknown>),
    queryFn: () => disposalsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useDisposal = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.disposals.byId(id) : ['disposals', 'detail', 'noop'],
    queryFn: () => disposalsApi.getById(id as string),
    enabled: !!id,
  });

export const useDisposalsForAsset = (assetId: string | undefined) =>
  useQuery({
    queryKey: assetId
      ? queryKeys.disposals.byAsset(assetId)
      : ['disposals', 'by-asset', 'noop'],
    queryFn: () => disposalsApi.listForAsset(assetId as string),
    enabled: !!assetId,
  });

export const useRequestDisposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RequestDisposalPayload) => disposalsApi.request(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useApproveDisposal = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApproveDisposalPayload) => disposalsApi.approve(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useRejectDisposal = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RejectDisposalPayload) => disposalsApi.reject(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};
