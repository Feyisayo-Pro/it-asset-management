import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AuditLogEntry } from '../../domain/entities/audit-log-entry.entity';
import {
  AuditLogRepository,
  AuditQueryParams,
  AuditQueryResult,
} from '../../domain/repositories/audit-log.repository';
import { AuditLogOrmEntity } from '../typeorm-entities/audit-log.orm-entity';

@Injectable()
export class TypeOrmAuditLogRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogOrmEntity)
    private readonly repo: Repository<AuditLogOrmEntity>,
  ) {}

  async append(entry: AuditLogEntry): Promise<void> {
    const props = entry.toPersistence();
    const row = new AuditLogOrmEntity();
    row.id = props.id;
    row.userId = props.userId;
    row.action = props.action;
    row.entityType = props.entityType;
    row.entityId = props.entityId;
    row.oldValue = props.oldValue;
    row.newValue = props.newValue;
    row.ip = props.ip;
    row.userAgent = props.userAgent;
    row.correlationId = props.correlationId;
    row.occurredAt = props.occurredAt;
    await this.repo.save(row);
  }

  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    const qb = this.repo.createQueryBuilder('a');
    if (params.userId) qb.andWhere('a.user_id = :userId', { userId: params.userId });
    if (params.entityType) {
      qb.andWhere('a.entity_type = :entityType', { entityType: params.entityType });
    }
    if (params.entityId) {
      qb.andWhere('a.entity_id = :entityId', { entityId: params.entityId });
    }
    if (params.action) qb.andWhere('a.action = :action', { action: params.action });
    if (params.from && params.to) {
      qb.andWhere({ occurredAt: Between(params.from, params.to) });
    } else if (params.from) {
      qb.andWhere({ occurredAt: MoreThanOrEqual(params.from) });
    } else if (params.to) {
      qb.andWhere({ occurredAt: LessThanOrEqual(params.to) });
    }

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    qb.orderBy('a.occurred_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) =>
        AuditLogEntry.hydrate({
          id: r.id,
          userId: r.userId,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          oldValue: r.oldValue,
          newValue: r.newValue,
          ip: r.ip,
          userAgent: r.userAgent,
          correlationId: r.correlationId,
          occurredAt: r.occurredAt,
        }),
      ),
      page,
      pageSize,
      total,
    };
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    return AuditLogEntry.hydrate({
      id: row.id,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValue: row.oldValue,
      newValue: row.newValue,
      ip: row.ip,
      userAgent: row.userAgent,
      correlationId: row.correlationId,
      occurredAt: row.occurredAt,
    });
  }
}
