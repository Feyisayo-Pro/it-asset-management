import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { ChangeAssetStatusUseCase } from '../../../asset/application/use-cases/change-asset-status.use-case';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import {
  RETURN_SUBJECT_TYPE,
  ReturnReason,
} from '../../domain/value-objects/return-enums';
import { WorkflowCompletedEvent } from '../../../workflow/domain/events/workflow.events';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  ReturnCancelledEvent,
  ReturnCompletedEvent,
} from '../../domain/events/return.events';

/**
 * Reacts to the return workflow reaching a terminal state. This is the
 * single place where a completed return touches inventory:
 *
 *   reason Lost                    → asset Lost (holder cleared)
 *   outcome Pass                   → Returned → Available
 *   outcome Repair/ReplacementRec. → Returned → UnderRepair
 *   outcome Reject                 → Returned (parked for the Disposal
 *                                    workflow to pick up)
 *
 * Clearing currentHolderId closes the allocation for M-era scope —
 * when AllocationModule lands, it subscribes to return.completed and
 * closes its own record as well.
 */
@Injectable()
export class ReturnWorkflowCompletedHandler {
  private readonly logger = new Logger('ReturnWorkflowCompleted');

  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly changeAssetStatus: ChangeAssetStatusUseCase,
    private readonly events: EventPublisher,
  ) {}

  @OnEvent('workflow.completed')
  async handle(event: WorkflowCompletedEvent): Promise<void> {
    if (event.payload.subjectType !== RETURN_SUBJECT_TYPE) return;

    const record = await this.returns.findById(event.payload.subjectId);
    if (!record) {
      this.logger.warn(
        `workflow.completed for unknown return ${event.payload.subjectId}`,
      );
      return;
    }

    const now = this.clock.now();
    record.syncState(event.payload.finalState, now);
    await this.returns.save(record);

    if (event.payload.finalState === 'Cancelled') {
      this.events.publish(
        new ReturnCancelledEvent({ id: record.id, assetId: record.assetId }),
      );
      return;
    }

    // Completed → inventory update. Each changeStatus call is guarded
    // by the asset lifecycle state machine and writes its own history.
    let finalAssetStatus: AssetStatus;
    try {
      if (record.reason === ReturnReason.Lost) {
        finalAssetStatus = AssetStatus.Lost;
        await this.changeAssetStatus.execute({
          assetId: record.assetId,
          toStatus: AssetStatus.Lost,
          reason: `Return ${record.id}: reported lost`,
          newHolderId: null,
        });
      } else {
        await this.changeAssetStatus.execute({
          assetId: record.assetId,
          toStatus: AssetStatus.Returned,
          reason: `Return ${record.id}: received back into stores`,
          newHolderId: null,
        });
        switch (record.outcome) {
          case 'Pass':
            finalAssetStatus = AssetStatus.Available;
            await this.changeAssetStatus.execute({
              assetId: record.assetId,
              toStatus: AssetStatus.Available,
              reason: `Return ${record.id}: assessment passed`,
            });
            break;
          case 'RepairRecommended':
          case 'ReplacementRecommended':
            finalAssetStatus = AssetStatus.UnderRepair;
            await this.changeAssetStatus.execute({
              assetId: record.assetId,
              toStatus: AssetStatus.UnderRepair,
              reason: `Return ${record.id}: assessment outcome ${record.outcome}`,
            });
            break;
          default:
            // Reject (or missing outcome) → stays Returned pending a
            // disposal decision.
            finalAssetStatus = AssetStatus.Returned;
            break;
        }
      }
    } catch (err) {
      // Inventory update failures must be visible, not swallowed
      // silently — but they don't invalidate the completed workflow.
      this.logger.error(
        `Inventory update failed for return ${record.id}: ${(err as Error).message}`,
      );
      return;
    }

    this.events.publish(
      new ReturnCompletedEvent({
        id: record.id,
        assetId: record.assetId,
        outcome: record.outcome,
        reason: record.reason,
        finalAssetStatus,
      }),
    );
  }
}
