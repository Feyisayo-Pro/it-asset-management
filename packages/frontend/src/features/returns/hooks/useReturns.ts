import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { returnsApi } from '@/api/returns.api';

const invalidate = (
  qc: ReturnType<typeof useQueryClient>,
  id?: string,
) => {
  void qc.invalidateQueries({ queryKey: queryKeys.returns.all });
  if (id) void qc.invalidateQueries({ queryKey: queryKeys.returns.byId(id) });
  // Completion flips asset status — refresh those too.
  void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
};

export const useReturns = (params: {
  page: number;
  pageSize: number;
  state?: string;
}) =>
  useQuery({
    queryKey: queryKeys.returns.list(params as unknown as Record<string, unknown>),
    queryFn: () => returnsApi.list(params),
    placeholderData: (prev) => prev,
  });

export const useReturn = (id: string | undefined) =>
  useQuery({
    queryKey: id ? queryKeys.returns.byId(id) : ['returns', 'detail', 'noop'],
    queryFn: () => returnsApi.getById(id as string),
    enabled: !!id,
  });

export const useInitiateReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: returnsApi.initiate,
    onSuccess: () => invalidate(qc),
  });
};

export const useRecordItems = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Parameters<typeof returnsApi.recordItems>[1]) =>
      returnsApi.recordItems(id, items),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useCompleteAssessment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof returnsApi.completeAssessment>[1]) =>
      returnsApi.completeAssessment(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useSignReturn = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof returnsApi.sign>[1]) =>
      returnsApi.sign(id, payload),
    onSuccess: () => invalidate(qc, id),
  });
};

export const useCancelReturn = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => returnsApi.cancel(id, reason),
    onSuccess: () => invalidate(qc, id),
  });
};
