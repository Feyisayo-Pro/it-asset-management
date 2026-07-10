import { client } from './client';

export interface RoleDto {
  id: string;
  name: string;
  description: string;
}

export const rbacApi = {
  listRoles: async (): Promise<RoleDto[]> => {
    const { data } = await client.get<RoleDto[]>('/rbac/roles');
    return data;
  },
  myPermissions: async (): Promise<{ roleName: string; permissions: string[] }> => {
    const { data } = await client.get('/rbac/me/permissions');
    return data;
  },
};
