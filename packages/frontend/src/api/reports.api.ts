import { client } from './client';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  assetType?: string;
  brand?: string;
  employeeUserId?: string;
  status?: string;
}

export interface DashboardData {
  reportType: string;
  generatedAt: string;
  summary: {
    totalAssets: number;
    availableAssets: number;
    allocatedAssets: number;
    underRepair: number;
    disposedAssets: number;
    activeRepairs: number;
    pendingDisposals: number;
    totalReturns: number;
  };
  charts: {
    monthlyAllocations: Array<{ month: string; count: number }>;
    monthlyReturns: Array<{ month: string; count: number }>;
    assetDistribution: Array<{ assetType: string; count: number }>;
  };
}

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export const REPORT_TYPES = [
  'inventory',
  'allocation',
  'returns',
  'repairs',
  'disposals',
  'employee-asset-history',
  'department-summary',
  'compliance',
  'sla-performance',
  'dashboard',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const reportsApi = {
  dashboard: async (): Promise<DashboardData> => {
    const { data } = await client.get<DashboardData>('/reports/dashboard');
    return data;
  },
  getReport: async (
    type: ReportType,
    filters?: ReportFilters,
  ): Promise<Record<string, unknown>> => {
    const { data } = await client.get<Record<string, unknown>>(
      `/reports/${type}`,
      { params: filters },
    );
    return data;
  },
  exportReport: async (
    reportType: ReportType,
    format: ExportFormat,
    filters?: ReportFilters,
  ): Promise<Blob> => {
    const { data } = await client.get('/reports/export', {
      params: { reportType, format, ...filters },
      responseType: 'blob',
    });
    return data as Blob;
  },
};
