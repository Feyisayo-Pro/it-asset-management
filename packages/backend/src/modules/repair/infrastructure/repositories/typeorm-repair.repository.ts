import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  RepairRecord,
  RepairStatusHistoryProps,
} from '../../domain/entities/repair-record.entity';
import {
  ListRepairsParams,
  ListRepairsResult,
  RepairRepository,
} from '../../domain/repositories/repair.repository';
import {
  RepairRecordOrmEntity,
  RepairStatusHistoryOrmEntity,
} from '../typeorm-entities/repair.orm-entities';
import {
  RepairStatus,
  TERMINAL_REPAIR_STATUSES,
} from '../../domain/value-objects/repair-enums';

@Injectable()
export class TypeOrmRepairRepository implements RepairRepository {
  constructor(
    @InjectRepository(RepairRecordOrmEntity)
    private readonly repo: Repository<RepairRecordOrmEntity>,
    @InjectRepository(RepairStatusHistoryOrmEntity)
    private readonly historyRepo: Repository<RepairStatusHistoryOrmEntity>,
  ) {}

  async findById(id: string): Promise<RepairRecord | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByAssetId(assetId: string): Promise<RepairRecord | null> {
    const row = await this.repo.findOne({
      where: { assetId, status: Not(In(TERMINAL_REPAIR_STATUSES as unknown as string[])) },
      order: { reportedAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListRepairsParams): Promise<ListRepairsResult> {
    const qb = this.repo.createQueryBuilder('r');
    if (params.assetId) qb.andWhere('r.asset_id = :aid', { aid: params.assetId });
    if (params.status) qb.andWhere('r.status = :s', { s: params.status });
    if (params.technicianUserId) {
      qb.andWhere('r.technician_user_id = :tid', { tid: params.technicianUserId });
    }
    qb.orderBy('r.reported_at', 'DESC');

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

  async listByAssetId(assetId: string): Promise<RepairRecord[]> {
    const rows = await this.repo.find({
      where: { assetId },
      order: { reportedAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(record: RepairRecord): Promise<RepairRecord> {
    const p = record.toPersistence();
    const row = new RepairRecordOrmEntity();
    row.id = p.id;
    row.assetId = p.assetId;
    row.employeeUserId = p.employeeUserId;
    row.technicianUserId = p.technicianUserId;
    row.vendor = p.vendor;
    row.reportedFault = p.reportedFault;
    row.diagnosis = p.diagnosis;
    row.resolutionNotes = p.resolutionNotes;
    row.status = p.status;
    row.estimatedCostCents = p.estimatedCostCents == null ? null : String(p.estimatedCostCents);
    row.actualCostCents = p.actualCostCents == null ? null : String(p.actualCostCents);
    row.costCurrency = p.costCurrency;
    row.warrantyActiveAtIntake = p.warrantyActiveAtIntake;
    row.reportedAt = p.reportedAt;
    row.startedAt = p.startedAt;
    row.completedAt = p.completedAt;
    row.createdByUserId = p.createdByUserId;
    row.createdAt = p.createdAt;
    row.updatedAt = p.updatedAt;
    await this.repo.save(row);
    return record;
  }

  async appendStatusHistory(entry: RepairStatusHistoryProps): Promise<void> {
    const row = new RepairStatusHistoryOrmEntity();
    row.id = entry.id;
    row.repairId = entry.repairId;
    row.fromStatus = entry.fromStatus;
    row.toStatus = entry.toStatus;
    row.changedByUserId = entry.changedByUserId;
    row.note = entry.note;
    row.occurredAt = entry.occurredAt;
    await this.historyRepo.insert(row);
  }

  async listStatusHistory(repairId: string): Promise<RepairStatusHistoryProps[]> {
    const rows = await this.historyRepo.find({
      where: { repairId },
      order: { occurredAt: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      repairId: r.repairId,
      fromStatus: (r.fromStatus as RepairStatus | null) ?? null,
      toStatus: r.toStatus as RepairStatus,
      changedByUserId: r.changedByUserId,
      note: r.note,
      occurredAt: r.occurredAt,
    }));
  }

  private toDomain(row: RepairRecordOrmEntity): RepairRecord {
    return RepairRecord.hydrate({
      id: row.id,
      assetId: row.assetId,
      employeeUserId: row.employeeUserId,
      technicianUserId: row.technicianUserId,
      vendor: row.vendor,
      reportedFault: row.reportedFault,
      diagnosis: row.diagnosis,
      resolutionNotes: row.resolutionNotes,
      status: row.status as RepairStatus,
      estimatedCostCents: row.estimatedCostCents == null ? null : Number(row.estimatedCostCents),
      actualCostCents: row.actualCostCents == null ? null : Number(row.actualCostCents),
      costCurrency: row.costCurrency,
      warrantyActiveAtIntake: row.warrantyActiveAtIntake,
      reportedAt: row.reportedAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
