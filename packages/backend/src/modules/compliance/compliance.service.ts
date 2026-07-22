import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { ComplianceBreachOrmEntity } from './infrastructure/typeorm-entities/compliance-breach.orm-entity';

export interface BreachDto {
  id: string;
  workflowInstanceId: string;
  definitionKey: string;
  subjectType: string;
  subjectId: string;
  breachedState: string;
  slaMinutes: number;
  enteredAt: string;
  breachedAt: string;
  resolvedAt: string | null;
  escalationSent: boolean;
}

function toDto(e: ComplianceBreachOrmEntity): BreachDto {
  return {
    id: e.id,
    workflowInstanceId: e.workflowInstanceId,
    definitionKey: e.definitionKey,
    subjectType: e.subjectType,
    subjectId: e.subjectId,
    breachedState: e.breachedState,
    slaMinutes: e.slaMinutes,
    enteredAt: e.enteredAt.toISOString(),
    breachedAt: e.breachedAt.toISOString(),
    resolvedAt: e.resolvedAt?.toISOString() ?? null,
    escalationSent: e.escalationSent,
  };
}

export interface ComplianceDashboardDto {
  totalBreaches: number;
  openBreaches: number;
  resolvedBreaches: number;
  escalationsSent: number;
  breachesByDefinition: Array<{ definitionKey: string; count: number }>;
  breachesByState: Array<{ state: string; count: number }>;
}

export interface ListBreachesParams {
  page: number;
  pageSize: number;
  definitionKey?: string;
  resolved?: boolean;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ComplianceBreachOrmEntity)
    private readonly breachRepo: Repository<ComplianceBreachOrmEntity>,
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async detectBreaches(): Promise<number> {
    const rows: Array<{
      instance_id: string;
      definition_key: string;
      subject_type: string;
      subject_id: string;
      current_state: string;
      sla_minutes: number;
      current_stage_entered_at: string;
    }> = await this.em.query(`
      SELECT
        wi.id AS instance_id,
        wd.key AS definition_key,
        wi.subject_type,
        wi.subject_id,
        wi.current_state,
        ws.sla_minutes,
        wi.current_stage_entered_at
      FROM workflow_instances wi
      JOIN workflow_definitions wd ON wd.id = wi.definition_id
      JOIN workflow_stages ws ON ws.definition_id = wi.definition_id AND ws.state = wi.current_state
      WHERE wi.completed_at IS NULL
        AND ws.sla_minutes IS NOT NULL
        AND wi.current_stage_entered_at + (ws.sla_minutes || ' minutes')::INTERVAL < now()
        AND NOT EXISTS (
          SELECT 1 FROM compliance_breaches cb
          WHERE cb.workflow_instance_id = wi.id
            AND cb.breached_state = wi.current_state
            AND cb.resolved_at IS NULL
        )
    `);

    let created = 0;
    for (const r of rows) {
      const enteredAt = new Date(r.current_stage_entered_at);
      const breachedAt = new Date(enteredAt.getTime() + r.sla_minutes * 60_000);

      const breach = this.breachRepo.create({
        workflowInstanceId: r.instance_id,
        definitionKey: r.definition_key,
        subjectType: r.subject_type,
        subjectId: r.subject_id,
        breachedState: r.current_state,
        slaMinutes: r.sla_minutes,
        enteredAt,
        breachedAt,
      });
      await this.breachRepo.save(breach);
      created++;
    }

    if (created > 0) {
      this.logger.warn(`Detected ${created} new SLA breaches`);
    }
    return created;
  }

  async resolveBreaches(): Promise<number> {
    const result = await this.em.query(`
      UPDATE compliance_breaches cb
      SET resolved_at = now()
      WHERE cb.resolved_at IS NULL
        AND EXISTS (
          SELECT 1 FROM workflow_instances wi
          WHERE wi.id = cb.workflow_instance_id
            AND (wi.current_state != cb.breached_state OR wi.completed_at IS NOT NULL)
        )
    `);
    const resolved = result?.[1] ?? 0;
    if (resolved > 0) {
      this.logger.log(`Auto-resolved ${resolved} SLA breaches`);
    }
    return resolved;
  }

  async getDashboard(): Promise<ComplianceDashboardDto> {
    const [total, open, escalated] = await Promise.all([
      this.breachRepo.count(),
      this.breachRepo.count({ where: { resolvedAt: IsNull() } }),
      this.breachRepo.count({ where: { escalationSent: true } }),
    ]);

    const byDefinition: Array<{ definition_key: string; count: string }> =
      await this.em.query(`
        SELECT definition_key, COUNT(*)::TEXT AS count
        FROM compliance_breaches
        GROUP BY definition_key
        ORDER BY count DESC
      `);

    const byState: Array<{ breached_state: string; count: string }> =
      await this.em.query(`
        SELECT breached_state, COUNT(*)::TEXT AS count
        FROM compliance_breaches
        WHERE resolved_at IS NULL
        GROUP BY breached_state
        ORDER BY count DESC
      `);

    return {
      totalBreaches: total,
      openBreaches: open,
      resolvedBreaches: total - open,
      escalationsSent: escalated,
      breachesByDefinition: byDefinition.map((r) => ({
        definitionKey: r.definition_key,
        count: Number(r.count),
      })),
      breachesByState: byState.map((r) => ({
        state: r.breached_state,
        count: Number(r.count),
      })),
    };
  }

  async listBreaches(params: ListBreachesParams) {
    const qb = this.breachRepo.createQueryBuilder('b');

    if (params.definitionKey) {
      qb.andWhere('b.definition_key = :key', { key: params.definitionKey });
    }
    if (params.resolved === true) {
      qb.andWhere('b.resolved_at IS NOT NULL');
    } else if (params.resolved === false) {
      qb.andWhere('b.resolved_at IS NULL');
    }

    qb.orderBy('b.breachedAt', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), page, pageSize, total };
  }
}
