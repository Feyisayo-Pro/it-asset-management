import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChangeAssetStatusUseCase } from '../../../asset/application/use-cases/change-asset-status.use-case';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import { RepairCompletedEvent } from '../../domain/events/repair.events';

/**
 * When a repair reaches Completed, flip the asset back to Available so
 * Stores can reallocate. Failed repairs leave the asset in UnderRepair
 * (someone will re-attempt or escalate). BeyondRepair intentionally
 * does NOT auto-flip — the asset waits in UnderRepair for a Disposal
 * request. All flips go through the lifecycle-guarded use case so
 * asset_status_history gets its row and the asset's timeline includes
 * every repair event alongside allocations and returns.
 */
@Injectable()
export class RepairCompletedHandler {
  private readonly logger = new Logger('RepairCompleted');

  constructor(private readonly changeAssetStatus: ChangeAssetStatusUseCase) {}

  @OnEvent('repair.completed')
  async handle(event: RepairCompletedEvent): Promise<void> {
    if (event.payload.outcome !== 'Completed') return;
    try {
      await this.changeAssetStatus.execute({
        assetId: event.payload.assetId,
        toStatus: AssetStatus.Available,
        reason: `Repair ${event.payload.id} completed`,
      });
    } catch (err) {
      this.logger.error(
        `Asset flip failed for completed repair ${event.payload.id}: ${(err as Error).message}`,
      );
    }
  }
}
