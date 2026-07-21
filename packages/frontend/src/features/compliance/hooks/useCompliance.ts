import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { ListBreachesParams, complianceApi } from '@/api/compliance.api';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
};

export const useComplianceDashboard = () =>
  useQuery({
    queryKey: queryKeys.compliance.dashboard,
    queryFn: () => complianceApi.dashboard(),
  });

export const useBreaches = (params: ListBreachesParams) =>
  useQuery({
    queryKey: queryKeys.compliance.breaches(params as unknown as Record<string, unknown>),
    queryFn: () => complianceApi.listBreaches(params),
    placeholderData: (prev) => prev,
  });

export const useRunScan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => complianceApi.runScan(),
    onSuccess: () => invalidate(qc),
  });
};
