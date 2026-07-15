import { DisposalRecord } from '../../../src/modules/disposal/domain/entities/disposal-record.entity';
import {
  DisposalRepository,
  ListDisposalsParams,
  ListDisposalsResult,
} from '../../../src/modules/disposal/domain/repositories/disposal.repository';

export class FakeDisposalRepository implements DisposalRepository {
  public records = new Map<string, DisposalRecord>();

  async findById(id: string): Promise<DisposalRecord | null> {
    return this.records.get(id) ?? null;
  }
  async findActiveByAssetId(assetId: string): Promise<DisposalRecord | null> {
    for (const r of this.records.values()) {
      if (r.assetId === assetId && r.status === 'Requested') return r;
    }
    return null;
  }
  async findApprovedByAssetId(assetId: string): Promise<DisposalRecord | null> {
    for (const r of this.records.values()) {
      if (r.assetId === assetId && r.status === 'Approved') return r;
    }
    return null;
  }
  async list(params: ListDisposalsParams): Promise<ListDisposalsResult> {
    let items = Array.from(this.records.values());
    if (params.assetId) items = items.filter((r) => r.assetId === params.assetId);
    if (params.status) items = items.filter((r) => r.status === params.status);
    if (params.requestedByUserId) {
      items = items.filter((r) => r.requestedByUserId === params.requestedByUserId);
    }
    if (params.approvedByUserId) {
      items = items.filter((r) => r.approvedByUserId === params.approvedByUserId);
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
  async listByAssetId(assetId: string): Promise<DisposalRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.assetId === assetId);
  }
  async save(record: DisposalRecord): Promise<DisposalRecord> {
    this.records.set(record.id, record);
    return record;
  }
}
