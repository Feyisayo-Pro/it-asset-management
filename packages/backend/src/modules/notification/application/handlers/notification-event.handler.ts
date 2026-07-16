import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { NotificationService } from '../notification.service';
import { NotificationEventType } from '../../domain/enums/notification.enums';
import { DomainEvent } from '../../../../common/events/base-event';

@Injectable()
export class NotificationEventHandler {
  private readonly logger = new Logger('NotificationEventHandler');

  constructor(
    private readonly notificationService: NotificationService,
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  @OnEvent('workflow.instance.created')
  async onAllocationRequested(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      instanceId: string;
      definitionKey: string;
      subjectType: string;
      subjectId: string;
      startedByUserId: string | null;
    };
    if (p.subjectType !== 'allocation') return;
    const admins = await this.findUsersByRoleName('SUPER_ADMIN');
    const storeOfficers = await this.findUsersByRoleName('STORES_OFFICER');
    const recipients = [...admins, ...storeOfficers];
    await this.notificationService.sendToMany(
      recipients,
      NotificationEventType.AllocationRequested,
      'New Allocation Request',
      `A new asset allocation has been requested (workflow ${p.instanceId.slice(0, 8)}).`,
      { instanceId: p.instanceId, subjectId: p.subjectId },
    );
  }

  @OnEvent('workflow.completed')
  async onWorkflowCompleted(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      instanceId: string;
      finalState: string;
      subjectType: string;
      subjectId: string;
    };
    if (p.subjectType !== 'allocation') return;
    const instance = await this.em.query(
      `SELECT "started_by_user_id" FROM "workflow_instances" WHERE "id" = $1`,
      [p.instanceId],
    );
    const initiatorId = instance?.[0]?.started_by_user_id;
    if (!initiatorId) return;

    const user = await this.lookupUser(initiatorId);
    if (!user) return;

    const approved = p.finalState.toLowerCase().includes('approved') ||
      p.finalState.toLowerCase().includes('complete');
    const eventType = approved
      ? NotificationEventType.AllocationApproved
      : NotificationEventType.AllocationRejected;
    const subject = approved ? 'Allocation Approved' : 'Allocation Rejected';
    const message = approved
      ? `Your asset allocation request has been approved.`
      : `Your asset allocation request has been rejected.`;

    await this.notificationService.send({
      recipientUserId: user.id,
      recipientEmail: user.email,
      eventType,
      subject,
      message,
      metadata: { instanceId: p.instanceId, finalState: p.finalState },
    });
  }

  @OnEvent('assessment.completed')
  async onAssessmentCompleted(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      id: string;
      assetId: string;
      outcome: string;
      technicianUserId: string;
    };
    const admins = await this.findUsersByRoleName('SUPER_ADMIN');
    await this.notificationService.sendToMany(
      admins,
      NotificationEventType.AssessmentCompleted,
      'Assessment Completed',
      `Device assessment completed for asset ${p.assetId.slice(0, 8)}. Outcome: ${p.outcome}.`,
      { assessmentId: p.id, assetId: p.assetId, outcome: p.outcome },
    );
  }

  @OnEvent('return.completed')
  async onAssetReturned(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      id: string;
      assetId: string;
      reason: string;
    };
    const storeOfficers = await this.findUsersByRoleName('STORES_OFFICER');
    await this.notificationService.sendToMany(
      storeOfficers,
      NotificationEventType.AssetReturned,
      'Asset Returned',
      `Asset ${p.assetId.slice(0, 8)} has been returned. Reason: ${p.reason}.`,
      { returnId: p.id, assetId: p.assetId },
    );
  }

  @OnEvent('repair.opened')
  async onRepairRequested(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      id: string;
      assetId: string;
      reportedFault: string;
      createdByUserId: string;
    };
    const itReps = await this.findUsersByRoleName('IT_REP');
    await this.notificationService.sendToMany(
      itReps,
      NotificationEventType.RepairRequested,
      'Repair Requested',
      `A new repair has been opened for asset ${p.assetId.slice(0, 8)}: ${p.reportedFault.slice(0, 100)}.`,
      { repairId: p.id, assetId: p.assetId },
    );
  }

  @OnEvent('repair.completed')
  async onRepairCompleted(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      id: string;
      assetId: string;
      outcome: string;
    };
    const repair = await this.em.query(
      `SELECT "created_by_user_id" FROM "repair_records" WHERE "id" = $1`,
      [p.id],
    );
    const creatorId = repair?.[0]?.created_by_user_id;
    if (!creatorId) return;

    const user = await this.lookupUser(creatorId);
    if (!user) return;

    await this.notificationService.send({
      recipientUserId: user.id,
      recipientEmail: user.email,
      eventType: NotificationEventType.RepairCompleted,
      subject: 'Repair Completed',
      message: `Repair for asset ${p.assetId.slice(0, 8)} is complete. Outcome: ${p.outcome}.`,
      metadata: { repairId: p.id, assetId: p.assetId, outcome: p.outcome },
    });
  }

  @OnEvent('disposal.approved')
  async onDisposalApproved(event: DomainEvent): Promise<void> {
    const p = event.payload as {
      id: string;
      assetId: string;
      approvedByUserId: string;
    };
    const disposal = await this.em.query(
      `SELECT "requested_by_user_id" FROM "disposal_records" WHERE "id" = $1`,
      [p.id],
    );
    const requesterId = disposal?.[0]?.requested_by_user_id;
    if (!requesterId) return;

    const user = await this.lookupUser(requesterId);
    if (!user) return;

    await this.notificationService.send({
      recipientUserId: user.id,
      recipientEmail: user.email,
      eventType: NotificationEventType.DisposalApproved,
      subject: 'Disposal Approved',
      message: `Your disposal request for asset ${p.assetId.slice(0, 8)} has been approved.`,
      metadata: { disposalId: p.id, assetId: p.assetId },
    });
  }

  private async lookupUser(
    userId: string,
  ): Promise<{ id: string; email: string } | null> {
    const rows = await this.em.query(
      `SELECT "id", "email" FROM "users" WHERE "id" = $1 AND "is_active" = true`,
      [userId],
    );
    return rows?.[0] ?? null;
  }

  private async findUsersByRoleName(
    roleName: string,
  ): Promise<Array<{ userId: string; email: string }>> {
    const rows: Array<{ id: string; email: string }> = await this.em.query(
      `SELECT u."id", u."email" FROM "users" u
       JOIN "roles" r ON u."role_id" = r."id"
       WHERE r."name" = $1 AND u."is_active" = true`,
      [roleName],
    );
    return rows.map((r) => ({ userId: r.id, email: r.email }));
  }
}
