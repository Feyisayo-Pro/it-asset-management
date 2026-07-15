import {
  RepairRecord,
  RepairStatusHistoryProps,
} from '../../../src/modules/repair/domain/entities/repair-record.entity';
import {
  ListRepairsParams,
  ListRepairsResult,
  RepairRepository,
} from '../../../src/modules/repair/domain/repositories/repair.repository';

export class FakeRepairRepository implements RepairRepository {
  public records = new Map<string, RepairRecord>();
  public history: RepairStatusHistoryProps[] = [];

  async findById(id: string): Promise<RepairRecord | null> {
    return this.records.get(id) ?? null;
  }
  async findActiveByAssetId(assetId: string): Promise<RepairRecord | null> {
    for (const r of this.records.values()) {
      if (r.assetId === assetId && !r.isTerminal()) return r;
    }
    return null;
  }
  async list(params: ListRepairsParams): Promise<ListRepairsResult> {
    let items = Array.from(this.records.values());
    if (params.assetId) items = items.filter((r) => r.assetId === params.assetId);
    if (params.status) items = items.filter((r) => r.status === params.status);
    if (params.technicianUserId) {
      items = items.filter((r) => r.technicianUserId === params.technicianUserId);
    }
    const total = items.length;
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    return {
      data: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
    };
  }
  async listByAssetId(assetId: string): Promise<RepairRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.assetId === assetId);
  }
  async save(record: RepairRecord): Promise<RepairRecord> {
    this.records.set(record.id, record);
    return record;
  }
  async appendStatusHistory(entry: RepairStatusHistoryProps): Promise<void> {
    this.history.push(entry);
  }
  async listStatusHistory(repairId: string): Promise<RepairStatusHistoryProps[]> {
    return this.history.filter((h) => h.repairId === repairId);
  }
}
