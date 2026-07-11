import { Asset } from '../entities/asset.entity';
import { AssetStatusHistory } from '../entities/asset-status-history.entity';
import { AssetStatus } from '../value-objects/asset-status';

export const ASSET_REPOSITORY = Symbol('ASSET_REPOSITORY');

export type AssetSortField = 'assetTag' | 'serialNumber' | 'status' | 'createdAt';

export interface ListAssetsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: AssetStatus;
  deviceType?: string;
  brand?: string;
  department?: string;
  currentHolderId?: string;
  sort?: { field: AssetSortField; direction: 'asc' | 'desc' };
}

export interface ListAssetsResult {
  data: Asset[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssetRepository {
  findById(id: string): Promise<Asset | null>;
  findByTag(tag: string): Promise<Asset | null>;
  findBySerialNumber(sn: string): Promise<Asset | null>;
  findByImei(imei: string): Promise<Asset | null>;
  list(params: ListAssetsParams): Promise<ListAssetsResult>;
  save(asset: Asset): Promise<Asset>;
  saveMany(assets: Asset[]): Promise<Asset[]>;
  delete(id: string): Promise<void>;
  appendStatusHistory(entry: AssetStatusHistory): Promise<void>;
  listStatusHistory(assetId: string): Promise<AssetStatusHistory[]>;
  countAllForYear(year: number): Promise<number>;
}
