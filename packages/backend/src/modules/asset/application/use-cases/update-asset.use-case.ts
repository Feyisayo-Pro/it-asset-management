import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Asset } from '../../domain/entities/asset.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssetUpdatedEvent } from '../../domain/events/asset.events';
import {
  AssetNotFoundError,
  DuplicateImeiError,
} from '../../../../common/errors/asset.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface UpdateAssetCommand {
  assetId: string;
  deviceType?: string;
  brand?: string;
  model?: string;
  imei?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  purchaseCurrency?: string;
  vendor?: string | null;
  warrantyExpiry?: string | null;
  officeLocation?: string | null;
  department?: string | null;
  notes?: string | null;
}

@Injectable()
export class UpdateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: UpdateAssetCommand): Promise<Asset> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);

    if (command.imei && command.imei !== asset.imei) {
      const existing = await this.assets.findByImei(command.imei);
      if (existing && existing.id !== asset.id) {
        throw new DuplicateImeiError(command.imei);
      }
    }

    const patch: Record<string, unknown> = {};
    const changed: string[] = [];
    const assign = <K extends keyof typeof patch>(key: K, incoming: unknown, current: unknown) => {
      if (incoming !== undefined && incoming !== current) {
        patch[key] = incoming;
        changed.push(String(key));
      }
    };

    assign('deviceType', command.deviceType, asset.deviceType);
    assign('brand', command.brand, asset.brand);
    assign('model', command.model, asset.model);
    assign('imei', command.imei, asset.imei);
    assign(
      'purchaseDate',
      command.purchaseDate === undefined
        ? undefined
        : command.purchaseDate === null
        ? null
        : new Date(command.purchaseDate),
      asset.purchaseDate,
    );
    if (command.purchaseAmount !== undefined) {
      const nextCents =
        command.purchaseAmount === null
          ? null
          : Math.round(command.purchaseAmount * 100);
      if (nextCents !== asset.purchaseAmountCents) {
        patch.purchaseAmountCents = nextCents;
        changed.push('purchaseAmountCents');
      }
    }
    assign('purchaseCurrency', command.purchaseCurrency, asset.purchaseCurrency);
    assign('vendor', command.vendor, asset.vendor);
    assign(
      'warrantyExpiry',
      command.warrantyExpiry === undefined
        ? undefined
        : command.warrantyExpiry === null
        ? null
        : new Date(command.warrantyExpiry),
      asset.warrantyExpiry,
    );
    assign('officeLocation', command.officeLocation, asset.officeLocation);
    assign('department', command.department, asset.department);
    assign('notes', command.notes, asset.notes);

    if (changed.length === 0) return asset;

    asset.updateDetails(patch, this.clock.now());
    await this.assets.save(asset);

    this.events.publish(
      new AssetUpdatedEvent({
        id: asset.id,
        changedFields: changed,
        updatedByUserId: asyncContext.get()?.userId ?? null,
      }),
    );
    return asset;
  }
}
