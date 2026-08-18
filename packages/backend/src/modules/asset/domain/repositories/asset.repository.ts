import { Readable } from 'node:stream';
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
  officeLocation?: string;
  currentHolderId?: string;
  sort?: { field: AssetSortField; direction: 'asc' | 'desc' };
}

export interface ListAssetsResult {
  data: Asset[];
  page: number;
  pageSize: number;
  total: number;
}

/** Flat row shape produced for CSV export — one column per output field. */
export interface AssetExportRow {
  asset_tag: string;
  device_type: string;
  brand: string;
  model: string;
  serial_number: string;
  imei: string;
  status: string;
  purchase_date: string;
  purchase_amount: string;
  purchase_currency: string;
  vendor: string;
  warranty_expiry: string;
  office_location: string;
  department: string;
  current_holder_id: string;
  notes: string;
}

export interface AssetRepository {
  findById(id: string): Promise<Asset | null>;
  findByTag(tag: string): Promise<Asset | null>;
  findBySerialNumber(sn: string): Promise<Asset | null>;
  findByImei(imei: string): Promise<Asset | null>;
  list(params: ListAssetsParams): Promise<ListAssetsResult>;
  /**
   * Object-mode Readable of export rows for the given filters, streamed
   * directly from the DB (no pagination, no in-memory accumulation) so
   * large inventories don't have to fit in process memory.
   */
  streamForExport(filters: Omit<ListAssetsParams, 'page' | 'pageSize'>): Promise<Readable>;
  save(asset: Asset): Promise<Asset>;
  saveMany(assets: Asset[]): Promise<Asset[]>;
  delete(id: string): Promise<void>;
  appendStatusHistory(entry: AssetStatusHistory): Promise<void>;
  listStatusHistory(assetId: string): Promise<AssetStatusHistory[]>;
  countAllForYear(year: number): Promise<number>;
  /**
   * Runs `work` against a repository bound to a single DB transaction
   * (TypeORM QueryRunner) — commits on success, rolls back on throw.
   * Use for multi-row writes that must land atomically (e.g. bulk import).
   */
  withTransaction<T>(work: (repo: AssetRepository) => Promise<T>): Promise<T>;
}
