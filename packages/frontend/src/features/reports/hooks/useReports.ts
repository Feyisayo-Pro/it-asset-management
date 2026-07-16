import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
  ExportFormat,
  ReportFilters,
  ReportType,
  reportsApi,
} from '@/api/reports.api';

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.reports.dashboard,
    queryFn: () => reportsApi.dashboard(),
  });

export const useReport = (
  type: ReportType,
  filters?: ReportFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.reports.byType(
      type,
      filters as unknown as Record<string, unknown>,
    ),
    queryFn: () => reportsApi.getReport(type, filters),
    enabled,
  });

export const downloadExport = async (
  reportType: ReportType,
  format: ExportFormat,
  filters?: ReportFilters,
) => {
  const blob = await reportsApi.exportReport(reportType, format, filters);
  const ext = format === 'excel' ? 'xls' : format;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};
