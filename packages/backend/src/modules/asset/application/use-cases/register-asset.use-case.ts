import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatus } from '../../domain/value-objects/asset-status';
import { AssetTagGenerator } from '../../domain/services/asset-tag-generator';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  AssetRegisteredEvent,
  AssetStatusChangedEvent,
} from '../../domain/events/asset.events';
import {
  DuplicateAssetTagError,
  DuplicateImeiError,
  DuplicateSerialNumberError,
} from '../../../../common/errors/asset.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface RegisterAssetCommand {
  assetTag?: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  imei?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  purchaseCurrency?: string;
  vendor?: string | null;
  warrantyExpiry?: string | null;
  officeLocation?: string | null;
  department?: string | null;
  notes?: string | null;
  markAvailableImmediately?: boolean;
}

@Injectable()
export class RegisterAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RegisterAssetCommand): Promise<Asset> {
    const now = this.clock.now();
    const year = now.getUTCFullYear();

    let tag = command.assetTag?.trim().toUpperCase() ?? '';
    if (!tag) {
      const seq = (await this.assets.countAllForYear(year)) + 1;
      tag = AssetTagGenerator.build(year, seq);
    }
    if (await this.assets.findByTag(tag)) throw new DuplicateAssetTagError(tag);
    if (await this.assets.findBySerialNumber(command.serialNumber)) {
      throw new DuplicateSerialNumberError(command.serialNumber);
    }
    if (command.imei && (await this.assets.findByImei(command.imei))) {
      throw new DuplicateImeiError(command.imei);
    }

    const asset = Asset.register({
      id: this.ids.next(),
      assetTag: tag,
      deviceType: command.deviceType,
      brand: command.brand,
      model: command.model,
      serialNumber: command.serialNumber,
      imei: command.imei ?? null,
      purchaseDate: command.purchaseDate ? new Date(command.purchaseDate) : null,
      purchaseAmountCents:
        command.purchaseAmount != null
          ? Math.round(command.purchaseAmount * 100)
          : null,
      purchaseCurrency: command.purchaseCurrency ?? 'USD',
      vendor: command.vendor ?? null,
      warrantyExpiry: command.warrantyExpiry
        ? new Date(command.warrantyExpiry)
        : null,
      officeLocation: command.officeLocation ?? null,
      department: command.department ?? null,
      notes: command.notes ?? null,
      now,
    });

    await this.assets.save(asset);

    const ctx = asyncContext.get();
    const initialHistory = AssetStatusHistory.append({
      id: this.ids.next(),
      assetId: asset.id,
      fromStatus: null,
      toStatus: asset.status,
      changedByUserId: ctx?.userId ?? null,
      reason: 'Initial registration',
      occurredAt: now,
    });
    await this.assets.appendStatusHistory(initialHistory);

    if (command.markAvailableImmediately) {
      const before = asset.status;
      asset.changeStatus(AssetStatus.Available, now);
      await this.assets.save(asset);
      await this.assets.appendStatusHistory(
        AssetStatusHistory.append({
          id: this.ids.next(),
          assetId: asset.id,
          fromStatus: before,
          toStatus: asset.status,
          changedByUserId: ctx?.userId ?? null,
          reason: 'Marked available on registration',
          occurredAt: now,
        }),
      );
      this.events.publish(
        new AssetStatusChangedEvent({
          id: asset.id,
          from: before,
          to: asset.status,
          reason: 'Marked available on registration',
          changedByUserId: ctx?.userId ?? null,
        }),
      );
    }

    this.events.publish(
      new AssetRegisteredEvent({
        id: asset.id,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        registeredByUserId: ctx?.userId ?? null,
      }),
    );

    return asset;
  }
}
