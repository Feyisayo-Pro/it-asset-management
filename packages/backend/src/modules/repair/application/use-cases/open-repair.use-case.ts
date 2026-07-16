import { Inject, Injectable } from '@nestjs/common';
import {
  REPAIR_REPOSITORY,
  RepairRepository,
} from '../../domain/repositories/repair.repository';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../../asset/domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { ChangeAssetStatusUseCase } from '../../../asset/application/use-cases/change-asset-status.use-case';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import { RepairRecord } from '../../domain/entities/repair-record.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { RepairOpenedEvent } from '../../domain/events/repair.events';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';
import { ActiveRepairExistsError } from '../../../../common/errors/repair.errors';

export interface OpenRepairCommand {
  assetId: string;
  reportedFault: string;
  createdByUserId: string;
  employeeUserId?: string | null;
  technicianUserId?: string | null;
  vendor?: string | null;
  estimatedCost?: number | null;
  costCurrency?: string;
}

@Injectable()
export class OpenRepairUseCase {
  constructor(
    @Inject(REPAIR_REPOSITORY) private readonly repairs: RepairRepository,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly changeAssetStatus: ChangeAssetStatusUseCase,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: OpenRepairCommand): Promise<RepairRecord> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);

    const active = await this.repairs.findActiveByAssetId(asset.id);
    if (active) throw new ActiveRepairExistsError(asset.id);

    const now = this.clock.now();
    const warrantyActive =
      asset.warrantyExpiry !== null ? asset.warrantyExpiry >= now : null;

    const record = RepairRecord.open({
      id: this.ids.next(),
      assetId: asset.id,
      employeeUserId: command.employeeUserId ?? asset.currentHolderId ?? null,
      reportedFault: command.reportedFault,
      createdByUserId: command.createdByUserId,
      technicianUserId: command.technicianUserId,
      vendor: command.vendor,
      estimatedCostCents:
        command.estimatedCost != null
          ? Math.round(command.estimatedCost * 100)
          : null,
      costCurrency: command.costCurrency,
      warrantyActiveAtIntake: warrantyActive,
      now,
    });
    await this.repairs.save(record);

    // Flip the asset to UnderRepair — the lifecycle machine accepts
    // this from Allocated/Available/Returned; the asset's own history
    // gets a row and stays the single source of truth for its timeline.
    if (asset.status !== AssetStatus.UnderRepair) {
      await this.changeAssetStatus.execute({
        assetId: asset.id,
        toStatus: AssetStatus.UnderRepair,
        reason: `Repair ${record.id} opened: ${command.reportedFault.slice(0, 80)}`,
      });
    }

    // Initial history entry (Pending) so the repair timeline is
    // self-contained.
    await this.repairs.appendStatusHistory({
      id: this.ids.next(),
      repairId: record.id,
      fromStatus: null,
      toStatus: record.status,
      changedByUserId: command.createdByUserId,
      note: 'Repair opened',
      occurredAt: now,
    });

    this.events.publish(
      new RepairOpenedEvent({
        id: record.id,
        assetId: asset.id,
        reportedFault: record.reportedFault,
        createdByUserId: command.createdByUserId,
      }),
    );
    return record;
  }
}
