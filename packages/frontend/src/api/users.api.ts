import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: string;
  isActive?: boolean;
  sortField?: 'lastName' | 'email' | 'lastLoginAt' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  password: string;
  mustChangePassword?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export const usersApi = {
  list: async (
    params: ListUsersParams,
  ): Promise<PagedResponse<AdminUserDto>> => {
    const { data } = await client.get<PagedResponse<AdminUserDto>>(
      '/admin/users',
      { params },
    );
    return data;
  },

  getById: async (id: string): Promise<AdminUserDto> => {
    const { data } = await client.get<AdminUserDto>(`/admin/users/${id}`);
    return data;
  },

  create: async (payload: CreateUserPayload): Promise<AdminUserDto> => {
    const { data } = await client.post<AdminUserDto>('/admin/users', payload);
    return data;
  },

  update: async (
    id: string,
    payload: UpdateUserPayload,
  ): Promise<AdminUserDto> => {
    const { data } = await client.patch<AdminUserDto>(
      `/admin/users/${id}`,
      payload,
    );
    return data;
  },

  changeRole: async (id: string, roleId: string): Promise<AdminUserDto> => {
    const { data } = await client.patch<AdminUserDto>(
      `/admin/users/${id}/role`,
      { roleId },
    );
    return data;
  },

  deactivate: async (id: string): Promise<AdminUserDto> => {
    const { data } = await client.post<AdminUserDto>(
      `/admin/users/${id}/deactivate`,
    );
    return data;
  },

  activate: async (id: string): Promise<AdminUserDto> => {
    const { data } = await client.post<AdminUserDto>(
      `/admin/users/${id}/activate`,
    );
    return data;
  },
};
