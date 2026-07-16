import { Inject, Injectable } from '@nestjs/common';
import {
  DISPOSAL_REPOSITORY,
  DisposalRepository,
} from '../../domain/repositories/disposal.repository';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../../asset/domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import { DisposalRecord } from '../../domain/entities/disposal-record.entity';
import {
  DisposalMethod,
  DisposalReason,
} from '../../domain/value-objects/disposal-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { DisposalRequestedEvent } from '../../domain/events/disposal.events';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';
import {
  ActiveDisposalExistsError,
  AssetAlreadyDisposedError,
} from '../../../../common/errors/disposal.errors';

export interface RequestDisposalCommand {
  assetId: string;
  requestedByUserId: string;
  reason: DisposalReason;
  method: DisposalMethod;
  requestNotes?: string | null;
  evidenceUrls?: string[];
  photoUrls?: string[];
}

@Injectable()
export class RequestDisposalUseCase {
  constructor(
    @Inject(DISPOSAL_REPOSITORY) private readonly disposals: DisposalRepository,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RequestDisposalCommand): Promise<DisposalRecord> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);
    if (asset.status === AssetStatus.Disposed) {
      throw new AssetAlreadyDisposedError(asset.id);
    }
    const active = await this.disposals.findActiveByAssetId(asset.id);
    if (active) throw new ActiveDisposalExistsError(asset.id);

    const record = DisposalRecord.request({
      id: this.ids.next(),
      assetId: asset.id,
      requestedByUserId: command.requestedByUserId,
      reason: command.reason,
      method: command.method,
      requestNotes: command.requestNotes,
      evidenceUrls: command.evidenceUrls,
      photoUrls: command.photoUrls,
      now: this.clock.now(),
    });
    await this.disposals.save(record);

    this.events.publish(
      new DisposalRequestedEvent({
        id: record.id,
        assetId: asset.id,
        requestedByUserId: command.requestedByUserId,
        reason: record.reason,
        method: record.method,
      }),
    );
    return record;
  }
}
