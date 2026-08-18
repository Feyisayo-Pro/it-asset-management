import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatus } from '../../domain/value-objects/asset-status';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssetStatusChangedEvent } from '../../domain/events/asset.events';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface ChangeAssetStatusCommand {
  assetId: string;
  toStatus: AssetStatus;
  reason: string;
  newHolderId?: string | null;
}

@Injectable()
export class ChangeAssetStatusUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ChangeAssetStatusCommand): Promise<Asset> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);
    const from = asset.status;
    const now = this.clock.now();
    const actor = asyncContext.get()?.userId ?? null;

    asset.changeStatus(command.toStatus, now, command.newHolderId);
    await this.assets.save(asset);
    await this.assets.appendStatusHistory(
      AssetStatusHistory.append({
        id: this.ids.next(),
        assetId: asset.id,
        fromStatus: from,
        toStatus: asset.status,
        changedByUserId: actor,
        reason: command.reason,
        occurredAt: now,
      }),
    );

    this.events.publish(
      new AssetStatusChangedEvent({
        id: asset.id,
        from,
        to: asset.status,
        reason: command.reason,
        changedByUserId: actor,
      }),
    );

    return asset;
  }
}
