import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  managerId: string | null;
  officeLocation: string;
  hireDate: string;
  employmentStatus: string;
  terminationDate: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAssignedAsset {
  id: string;
  asset_tag: string;
  device_type: string;
  brand: string;
  model: string;
  serial_number: string;
  status: string;
  created_at: string;
}

export interface EmployeeAssetHistoryEntry {
  id: string;
  workflowName: string;
  currentStage: string;
  status: string;
  createdAt: string;
  assetTag: string | null;
  deviceType: string | null;
}

export interface ListEmployeesParams {
  page: number;
  pageSize: number;
  search?: string;
  department?: string;
  officeLocation?: string;
  employmentStatus?: string;
  sortField?: 'lastName' | 'employeeCode' | 'department' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface CreateEmployeePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  managerId?: string | null;
  officeLocation: string;
  hireDate: string;
  userId?: string | null;
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'employeeCode' | 'hireDate'>>;

export const employeesApi = {
  list: async (params: ListEmployeesParams): Promise<PagedResponse<EmployeeDto>> => {
    const { data } = await client.get<PagedResponse<EmployeeDto>>('/employees', { params });
    return data;
  },
  getById: async (id: string): Promise<EmployeeDto> => {
    const { data } = await client.get<EmployeeDto>(`/employees/${id}`);
    return data;
  },
  getMyProfile: async (): Promise<EmployeeDto | null> => {
    const { data } = await client.get<EmployeeDto | null>('/employees/me');
    return data;
  },
  getAssignedAssets: async (id: string): Promise<EmployeeAssignedAsset[]> => {
    const { data } = await client.get<EmployeeAssignedAsset[]>(`/employees/${id}/assets`);
    return data;
  },
  getAssetHistory: async (id: string): Promise<EmployeeAssetHistoryEntry[]> => {
    const { data } = await client.get<EmployeeAssetHistoryEntry[]>(`/employees/${id}/history`);
    return data;
  },
  create: async (payload: CreateEmployeePayload): Promise<EmployeeDto> => {
    const { data } = await client.post<EmployeeDto>('/employees', payload);
    return data;
  },
  update: async (id: string, payload: UpdateEmployeePayload): Promise<EmployeeDto> => {
    const { data } = await client.patch<EmployeeDto>(`/employees/${id}`, payload);
    return data;
  },
  changeStatus: async (
    id: string,
    payload: { status: string; terminationDate?: string | null },
  ): Promise<EmployeeDto> => {
    const { data } = await client.patch<EmployeeDto>(`/employees/${id}/status`, payload);
    return data;
  },
};
