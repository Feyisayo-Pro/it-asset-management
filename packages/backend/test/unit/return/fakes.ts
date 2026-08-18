import { ReturnRecord } from '../../../src/modules/return/domain/entities/return-record.entity';
import {
  ListReturnsParams,
  ListReturnsResult,
  ReturnRepository,
} from '../../../src/modules/return/domain/repositories/return.repository';

export class FakeReturnRepository implements ReturnRepository {
  public records = new Map<string, ReturnRecord>();

  async findById(id: string): Promise<ReturnRecord | null> {
    return this.records.get(id) ?? null;
  }
  async findActiveByAssetId(assetId: string): Promise<ReturnRecord | null> {
    for (const r of this.records.values()) {
      if (r.assetId === assetId && !r.isTerminal()) return r;
    }
    return null;
  }
  async list(params: ListReturnsParams): Promise<ListReturnsResult> {
    let items = Array.from(this.records.values());
    if (params.state) items = items.filter((r) => r.currentState === params.state);
    if (params.assetId) items = items.filter((r) => r.assetId === params.assetId);
    if (params.initiatedByUserId) {
      items = items.filter((r) => r.initiatedByUserId === params.initiatedByUserId);
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
  async save(record: ReturnRecord): Promise<ReturnRecord> {
    this.records.set(record.id, record);
    return record;
  }
}
