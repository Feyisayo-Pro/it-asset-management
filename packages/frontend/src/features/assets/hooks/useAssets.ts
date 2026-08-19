import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  AssetDto,
  CreateAssetPayload,
  ListAssetsParams,
  UpdateAssetPayload,
  assetsApi,
} from '@/api/assets.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
};

export const useAssets = (params: ListAssetsParams) =>
  useQuery({
    queryKey: queryKeys.assets.list(params as unknown as Record<string, unknown>),
    queryFn: () => assetsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useAsset = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.assets.byId(id) : ['assets', 'detail', 'noop'],
    queryFn: () => assetsApi.getById(id as string),
    enabled: !!id,
  });

export const useAssetByTag = (tag: string | undefined) =>
  useQuery({
    queryKey: tag ? queryKeys.assets.byTag(tag) : ['assets', 'detail', 'byTag', 'noop'],
    queryFn: () => assetsApi.getByTag(tag as string),
    enabled: !!tag,
    retry: false,
  });

export const useAssetHistory = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.assets.history(id) : ['assets', 'history', 'noop'],
    queryFn: () => assetsApi.history(id as string),
    enabled: !!id,
  });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation<AssetDto, unknown, CreateAssetPayload>({
    mutationFn: (payload) => assetsApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateAsset = (id: string) => {
  const qc = useQueryClient();
  return useMutation<AssetDto, unknown, UpdateAssetPayload>({
    mutationFn: (payload) => assetsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.assets.byId(id), updated);
      invalidate(qc);
    },
  });
};

export const useChangeAssetStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation<
    AssetDto,
    unknown,
    { toStatus: string; reason: string; newHolderId?: string | null }
  >({
    mutationFn: (payload) => assetsApi.changeStatus(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.assets.byId(id), updated);
      void qc.invalidateQueries({ queryKey: queryKeys.assets.history(id) });
      invalidate(qc);
    },
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => assetsApi.delete(id),
    onSuccess: () => invalidate(qc),
  });
};

export const useBulkImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ csv, dryRun }: { csv: string; dryRun: boolean }) =>
      assetsApi.bulkImport(csv, dryRun),
    onSuccess: (_data, { dryRun }) => {
      if (!dryRun) invalidate(qc);
    },
  });
};
