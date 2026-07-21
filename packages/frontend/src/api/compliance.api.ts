import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface BreachDto {
  id: string;
  workflowInstanceId: string;
  definitionKey: string;
  subjectType: string;
  subjectId: string;
  breachedState: string;
  slaMinutes: number;
  enteredAt: string;
  breachedAt: string;
  resolvedAt: string | null;
  escalationSent: boolean;
}

export interface ComplianceDashboardDto {
  totalBreaches: number;
  openBreaches: number;
  resolvedBreaches: number;
  escalationsSent: number;
  breachesByDefinition: Array<{ definitionKey: string; count: number }>;
  breachesByState: Array<{ state: string; count: number }>;
}

export interface ListBreachesParams {
  page: number;
  pageSize: number;
  definitionKey?: string;
  resolved?: boolean;
}

export const complianceApi = {
  dashboard: async (): Promise<ComplianceDashboardDto> => {
    const { data } = await client.get<ComplianceDashboardDto>('/compliance/dashboard');
    return data;
  },
  listBreaches: async (params: ListBreachesParams): Promise<PagedResponse<BreachDto>> => {
    const { data } = await client.get<PagedResponse<BreachDto>>('/compliance/breaches', { params });
    return data;
  },
  runScan: async (): Promise<{ detected: number; resolved: number }> => {
    const { data } = await client.post<{ detected: number; resolved: number }>('/compliance/scan');
    return data;
  },
};
