import { ReturnRecord } from '../entities/return-record.entity';

export const RETURN_REPOSITORY = Symbol('RETURN_REPOSITORY');

export interface ListReturnsParams {
  page: number;
  pageSize: number;
  state?: string;
  assetId?: string;
  initiatedByUserId?: string;
}

export interface ListReturnsResult {
  data: ReturnRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReturnRepository {
  findById(id: string): Promise<ReturnRecord | null>;
  /** Active = not Completed and not Cancelled. */
  findActiveByAssetId(assetId: string): Promise<ReturnRecord | null>;
  list(params: ListReturnsParams): Promise<ListReturnsResult>;
  save(record: ReturnRecord): Promise<ReturnRecord>;
}
