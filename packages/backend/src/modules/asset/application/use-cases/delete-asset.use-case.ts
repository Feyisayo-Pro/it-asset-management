import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { AssetStatus } from '../../domain/value-objects/asset-status';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssetDeletedEvent } from '../../domain/events/asset.events';
import {
  AssetNotFoundError,
  InvalidAssetStatusTransitionError,
} from '../../../../common/errors/asset.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface DeleteAssetCommand { assetId: string; }

/**
 * "Delete" here is a hard delete restricted to assets that never left
 * the Registration bay — anything with lifecycle history stays
 * forever (arch §disposal + PROJECT_PROMPT §DISPOSAL). Callers must
 * dispose the asset instead of deleting it.
 */
@Injectable()
export class DeleteAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: DeleteAssetCommand): Promise<void> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);
    if (asset.status !== AssetStatus.Registration) {
      throw new InvalidAssetStatusTransitionError(asset.status, 'DELETED');
    }
    await this.assets.delete(asset.id);
    this.events.publish(
      new AssetDeletedEvent({
        id: asset.id,
        assetTag: asset.assetTag,
        deletedByUserId: asyncContext.get()?.userId ?? null,
      }),
    );
  }
}
