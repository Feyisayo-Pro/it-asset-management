import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisposalRecord } from '../../domain/entities/disposal-record.entity';
import {
  DisposalRepository,
  ListDisposalsParams,
  ListDisposalsResult,
} from '../../domain/repositories/disposal.repository';
import { DisposalRecordOrmEntity } from '../typeorm-entities/disposal.orm-entities';
import {
  DisposalMethod,
  DisposalReason,
  DisposalStatus,
} from '../../domain/value-objects/disposal-enums';

@Injectable()
export class TypeOrmDisposalRepository implements DisposalRepository {
  constructor(
    @InjectRepository(DisposalRecordOrmEntity)
    private readonly repo: Repository<DisposalRecordOrmEntity>,
  ) {}

  async findById(id: string): Promise<DisposalRecord | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByAssetId(assetId: string): Promise<DisposalRecord | null> {
    const row = await this.repo.findOne({
      where: { assetId, status: 'Requested' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findApprovedByAssetId(assetId: string): Promise<DisposalRecord | null> {
    const row = await this.repo.findOne({
      where: { assetId, status: 'Approved' },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListDisposalsParams): Promise<ListDisposalsResult> {
    const qb = this.repo.createQueryBuilder('d');
    if (params.assetId) qb.andWhere('d.asset_id = :aid', { aid: params.assetId });
    if (params.status) qb.andWhere('d.status = :s', { s: params.status });
    if (params.requestedByUserId) {
      qb.andWhere('d.requested_by_user_id = :rid', { rid: params.requestedByUserId });
    }
    if (params.approvedByUserId) {
      qb.andWhere('d.approved_by_user_id = :apid', { apid: params.approvedByUserId });
    }
    qb.orderBy('d.requested_at', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) => this.toDomain(r)),
      page,
      pageSize,
      total,
    };
  }

  async listByAssetId(assetId: string): Promise<DisposalRecord[]> {
    const rows = await this.repo.find({
      where: { assetId },
      order: { requestedAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(record: DisposalRecord): Promise<DisposalRecord> {
    const p = record.toPersistence();
    const row = new DisposalRecordOrmEntity();
    row.id = p.id;
    row.assetId = p.assetId;
    row.requestedByUserId = p.requestedByUserId;
    row.approvedByUserId = p.approvedByUserId;
    row.witnessUserId = p.witnessUserId;
    row.reason = p.reason;
    row.method = p.method;
    row.status = p.status;
    row.requestNotes = p.requestNotes;
    row.approvalNotes = p.approvalNotes;
    row.rejectionReason = p.rejectionReason;
    row.signatureName = p.signatureName;
    row.signatureIp = p.signatureIp;
    row.evidenceUrls = p.evidenceUrls;
    row.photoUrls = p.photoUrls;
    row.disposalDate = p.disposalDate;
    row.requestedAt = p.requestedAt;
    row.approvedAt = p.approvedAt;
    row.createdAt = p.createdAt;
    row.updatedAt = p.updatedAt;
    await this.repo.save(row);
    return record;
  }

  private toDomain(row: DisposalRecordOrmEntity): DisposalRecord {
    return DisposalRecord.hydrate({
      id: row.id,
      assetId: row.assetId,
      requestedByUserId: row.requestedByUserId,
      approvedByUserId: row.approvedByUserId,
      witnessUserId: row.witnessUserId,
      reason: row.reason as DisposalReason,
      method: row.method as DisposalMethod,
      status: row.status as DisposalStatus,
      requestNotes: row.requestNotes,
      approvalNotes: row.approvalNotes,
      rejectionReason: row.rejectionReason,
      signatureName: row.signatureName,
      signatureIp: row.signatureIp,
      evidenceUrls: Array.isArray(row.evidenceUrls) ? row.evidenceUrls : [],
      photoUrls: Array.isArray(row.photoUrls) ? row.photoUrls : [],
      disposalDate:
        row.disposalDate == null
          ? null
          : row.disposalDate instanceof Date
          ? row.disposalDate
          : new Date(row.disposalDate),
      requestedAt: row.requestedAt,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
