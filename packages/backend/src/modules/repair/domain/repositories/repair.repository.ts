import { RepairRecord, RepairStatusHistoryProps } from '../entities/repair-record.entity';
import { RepairStatus } from '../value-objects/repair-enums';

export const REPAIR_REPOSITORY = Symbol('REPAIR_REPOSITORY');

export interface ListRepairsParams {
  page: number;
  pageSize: number;
  assetId?: string;
  status?: RepairStatus;
  technicianUserId?: string;
}

export interface ListRepairsResult {
  data: RepairRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RepairRepository {
  findById(id: string): Promise<RepairRecord | null>;
  findActiveByAssetId(assetId: string): Promise<RepairRecord | null>;
  list(params: ListRepairsParams): Promise<ListRepairsResult>;
  listByAssetId(assetId: string): Promise<RepairRecord[]>;
  save(record: RepairRecord): Promise<RepairRecord>;
  appendStatusHistory(entry: RepairStatusHistoryProps): Promise<void>;
  listStatusHistory(repairId: string): Promise<RepairStatusHistoryProps[]>;
}
