import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { dashboardApi, DashboardFilters } from '@/api/dashboard.api';

export const useEnterpriseDashboard = (filters?: DashboardFilters) =>
  useQuery({
    queryKey: queryKeys.enterpriseDashboard.data(
      filters as unknown as Record<string, unknown>,
    ),
    queryFn: () => dashboardApi.getEnterpriseDashboard(filters),
    refetchInterval: 60_000,
  });

export const useDashboardFilterOptions = () =>
  useQuery({
    queryKey: queryKeys.enterpriseDashboard.filterOptions,
    queryFn: () => dashboardApi.getFilterOptions(),
    staleTime: 5 * 60_000,
  });
