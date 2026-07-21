import { client } from './client';

export interface MasterDataItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MasterDataCategory = 'departments' | 'offices' | 'device-types' | 'brands';

export const masterDataApi = {
  list: async (category: MasterDataCategory, includeInactive = true): Promise<MasterDataItem[]> => {
    const { data } = await client.get<MasterDataItem[]>(
      `/admin/master-data/${category}`,
      { params: { includeInactive: String(includeInactive) } },
    );
    return data;
  },
  create: async (category: MasterDataCategory, name: string): Promise<MasterDataItem> => {
    const { data } = await client.post<MasterDataItem>(
      `/admin/master-data/${category}`,
      { name },
    );
    return data;
  },
  update: async (
    category: MasterDataCategory,
    id: string,
    patch: { name?: string; isActive?: boolean },
  ): Promise<MasterDataItem> => {
    const { data } = await client.patch<MasterDataItem>(
      `/admin/master-data/${category}/${id}`,
      patch,
    );
    return data;
  },
  remove: async (category: MasterDataCategory, id: string): Promise<void> => {
    await client.delete(`/admin/master-data/${category}/${id}`);
  },
};
