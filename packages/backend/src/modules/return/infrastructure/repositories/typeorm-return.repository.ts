import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import {
  ReturnRecord,
  ReturnRecordProps,
} from '../../domain/entities/return-record.entity';
import {
  ListReturnsParams,
  ListReturnsResult,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { ReturnRecordOrmEntity } from '../typeorm-entities/return-record.orm-entity';
import { ReturnItemOrmEntity } from '../typeorm-entities/return-item.orm-entity';
import {
  AssessmentOutcome,
  ReturnItemStatus,
  ReturnItemType,
  ReturnReason,
} from '../../domain/value-objects/return-enums';

const TERMINAL_STATES = ['Completed', 'Cancelled'];

@Injectable()
export class TypeOrmReturnRepository implements ReturnRepository {
  constructor(
    @InjectRepository(ReturnRecordOrmEntity)
    private readonly repo: Repository<ReturnRecordOrmEntity>,
    @InjectRepository(ReturnItemOrmEntity)
    private readonly itemRepo: Repository<ReturnItemOrmEntity>,
  ) {}

  async findById(id: string): Promise<ReturnRecord | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findActiveByAssetId(assetId: string): Promise<ReturnRecord | null> {
    const row = await this.repo.findOne({
      where: { assetId, currentState: Not(In(TERMINAL_STATES)) },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async list(params: ListReturnsParams): Promise<ListReturnsResult> {
    const qb = this.repo.createQueryBuilder('r');
    if (params.state) qb.andWhere('r.current_state = :state', { state: params.state });
    if (params.assetId) qb.andWhere('r.asset_id = :assetId', { assetId: params.assetId });
    if (params.initiatedByUserId) {
      qb.andWhere('r.initiated_by_user_id = :uid', { uid: params.initiatedByUserId });
    }
    qb.orderBy('r.created_at', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const data = await Promise.all(rows.map((r) => this.toDomain(r)));
    return { data, page, pageSize, total };
  }

  async save(record: ReturnRecord): Promise<ReturnRecord> {
    const props = record.toPersistence();
    const row = new ReturnRecordOrmEntity();
    row.id = props.id;
    row.assetId = props.assetId;
    row.holderUserId = props.holderUserId;
    row.initiatedByUserId = props.initiatedByUserId;
    row.reason = props.reason;
    row.reasonNotes = props.reasonNotes;
    row.workflowInstanceId = props.workflowInstanceId;
    row.currentState = props.currentState;
    row.findings = props.findings;
    row.damageNotes = props.damageNotes;
    row.missingAccessories = props.missingAccessories;
    row.outcome = props.outcome;
    row.photoUrls = props.photoUrls;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    await this.repo.save(row);

    // Items: replace-all semantics keeps the aggregate write simple and
    // idempotent (recordItems always supplies the full list).
    await this.itemRepo.delete({ returnRecordId: props.id });
    for (const item of props.items) {
      const itemRow = new ReturnItemOrmEntity();
      itemRow.id = item.id;
      itemRow.returnRecordId = item.returnRecordId;
      itemRow.itemType = item.itemType;
      itemRow.description = item.description;
      itemRow.status = item.status;
      itemRow.notes = item.notes;
      await this.itemRepo.insert(itemRow);
    }
    return record;
  }

  private async toDomain(row: ReturnRecordOrmEntity): Promise<ReturnRecord> {
    const items = await this.itemRepo.find({
      where: { returnRecordId: row.id },
    });
    return ReturnRecord.hydrate({
      id: row.id,
      assetId: row.assetId,
      holderUserId: row.holderUserId,
      initiatedByUserId: row.initiatedByUserId,
      reason: row.reason as ReturnReason,
      reasonNotes: row.reasonNotes,
      workflowInstanceId: row.workflowInstanceId,
      currentState: row.currentState,
      findings: row.findings,
      damageNotes: row.damageNotes,
      missingAccessories: row.missingAccessories,
      outcome: (row.outcome as AssessmentOutcome | null) ?? null,
      photoUrls: row.photoUrls,
      items: items.map((i) => ({
        id: i.id,
        returnRecordId: i.returnRecordId,
        itemType: i.itemType as ReturnItemType,
        description: i.description,
        status: i.status as ReturnItemStatus,
        notes: i.notes,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
