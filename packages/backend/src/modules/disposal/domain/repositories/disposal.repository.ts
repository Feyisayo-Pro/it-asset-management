import { DisposalRecord } from '../entities/disposal-record.entity';
import { DisposalStatus } from '../value-objects/disposal-enums';

export const DISPOSAL_REPOSITORY = Symbol('DISPOSAL_REPOSITORY');

export interface ListDisposalsParams {
  page: number;
  pageSize: number;
  assetId?: string;
  status?: DisposalStatus;
  requestedByUserId?: string;
  approvedByUserId?: string;
}

export interface ListDisposalsResult {
  data: DisposalRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DisposalRepository {
  findById(id: string): Promise<DisposalRecord | null>;
  findActiveByAssetId(assetId: string): Promise<DisposalRecord | null>;
  findApprovedByAssetId(assetId: string): Promise<DisposalRecord | null>;
  list(params: ListDisposalsParams): Promise<ListDisposalsResult>;
  listByAssetId(assetId: string): Promise<DisposalRecord[]>;
  save(record: DisposalRecord): Promise<DisposalRecord>;
}
