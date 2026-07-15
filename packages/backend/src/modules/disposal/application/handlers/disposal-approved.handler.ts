import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChangeAssetStatusUseCase } from '../../../asset/application/use-cases/change-asset-status.use-case';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import { DisposalApprovedEvent } from '../../domain/events/disposal.events';

/**
 * When a disposal is approved, flip the asset to Disposed via the
 * lifecycle-guarded use case so asset_status_history gets its final
 * entry. Disposed is terminal in the AssetLifecycleStateMachine, so
 * no further status changes are allowed after this — that's what
 * enforces "disposed assets cannot be allocated again".
 */
@Injectable()
export class DisposalApprovedHandler {
  private readonly logger = new Logger('DisposalApproved');

  constructor(private readonly changeAssetStatus: ChangeAssetStatusUseCase) {}

  @OnEvent('disposal.approved')
  async handle(event: DisposalApprovedEvent): Promise<void> {
    try {
      await this.changeAssetStatus.execute({
        assetId: event.payload.assetId,
        toStatus: AssetStatus.Disposed,
        reason: `Disposal ${event.payload.id} approved (${event.payload.reason}/${event.payload.method})`,
        newHolderId: null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to flip asset ${event.payload.assetId} to Disposed for disposal ${event.payload.id}: ${(err as Error).message}`,
      );
    }
  }
}
