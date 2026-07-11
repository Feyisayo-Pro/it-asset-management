import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogEntry } from '../domain/entities/audit-log-entry.entity';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../domain/repositories/audit-log.repository';
import { asyncContext } from '../../../common/utils/async-context';
import { DomainEvent } from '../../../common/events/base-event';

interface LogInput {
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * AuditService — the only write path for audit_logs. Every module
 * either calls log() directly or emits a domain event that this
 * service catches via an @OnEvent wildcard listener.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly repo: AuditLogRepository,
  ) {}

  async log(input: LogInput): Promise<void> {
    const ctx = asyncContext.get();
    const entry = AuditLogEntry.append({
      id: uuidv4(),
      userId: ctx?.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      correlationId: ctx?.correlationId ?? null,
    });
    try {
      await this.repo.append(entry);
    } catch (err) {
      // Audit failures never block the primary flow — surfaced to logs
      // and (in production) a dedicated alert channel.
      this.logger.error(
        `Audit write failed for ${input.action} ${input.entityType}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Catch-all for domain events named `${module}.${entity}.${verb}`.
   * We use two levels of listeners because @nestjs/event-emitter's
   * strict-wildcard config is per-server. Every publisher registers
   * events under a namespace we care about; we scoped registrations
   * to the ones this service should persist.
   */
  @OnEvent('auth.admin.user.created')
  @OnEvent('auth.admin.user.updated')
  @OnEvent('auth.admin.user.role-changed')
  @OnEvent('auth.admin.user.activated')
  @OnEvent('auth.admin.user.deactivated')
  @OnEvent('auth.password.changed')
  @OnEvent('auth.account.locked')
  @OnEvent('asset.registered')
  @OnEvent('asset.updated')
  @OnEvent('asset.deleted')
  @OnEvent('asset.status-changed')
  @OnEvent('asset.bulk-imported')
  @OnEvent('workflow.instance.created')
  @OnEvent('workflow.stage.entered')
  @OnEvent('workflow.stage.completed')
  @OnEvent('workflow.completed')
  @OnEvent('workflow.bypassed')
  @OnEvent('return.initiated')
  @OnEvent('return.items-recorded')
  @OnEvent('return.assessed')
  @OnEvent('return.completed')
  @OnEvent('return.cancelled')
  async onDomainEvent(event: DomainEvent): Promise<void> {
    const payload = event.payload as
      | { id?: string; assetId?: string; userId?: string; instanceId?: string }
      | undefined;
    const entityId =
      payload?.id ?? payload?.assetId ?? payload?.userId ?? payload?.instanceId ?? null;
    await this.log({
      action: event.name,
      entityType: event.name.split('.')[0] ?? 'unknown',
      entityId,
      newValue: (payload ?? null) as Record<string, unknown> | null,
    });
  }
}
