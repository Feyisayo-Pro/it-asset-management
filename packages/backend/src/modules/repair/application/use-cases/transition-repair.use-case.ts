import { Inject, Injectable } from '@nestjs/common';
import {
  REPAIR_REPOSITORY,
  RepairRepository,
} from '../../domain/repositories/repair.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { RepairRecord } from '../../domain/entities/repair-record.entity';
import { RepairStatus } from '../../domain/value-objects/repair-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  RepairBeyondRepairEvent,
  RepairCompletedEvent,
  RepairStatusChangedEvent,
} from '../../domain/events/repair.events';
import { RepairNotFoundError } from '../../../../common/errors/repair.errors';

export interface TransitionRepairCommand {
  repairId: string;
  toStatus: RepairStatus;
  changedByUserId: string;
  diagnosis?: string | null;
  resolutionNotes?: string | null;
  actualCost?: number | null;
  note?: string | null;
}

@Injectable()
export class TransitionRepairUseCase {
  constructor(
    @Inject(REPAIR_REPOSITORY) private readonly repairs: RepairRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: TransitionRepairCommand): Promise<RepairRecord> {
    const record = await this.repairs.findById(command.repairId);
    if (!record) throw new RepairNotFoundError(command.repairId);

    const now = this.clock.now();
    const fromStatus = record.status;
    record.transition({
      to: command.toStatus,
      diagnosis: command.diagnosis,
      resolutionNotes: command.resolutionNotes,
      actualCostCents:
        command.actualCost === undefined
          ? undefined
          : command.actualCost === null
          ? null
          : Math.round(command.actualCost * 100),
      now,
    });
    await this.repairs.save(record);
    await this.repairs.appendStatusHistory({
      id: this.ids.next(),
      repairId: record.id,
      fromStatus,
      toStatus: record.status,
      changedByUserId: command.changedByUserId,
      note: command.note?.trim() || null,
      occurredAt: now,
    });

    this.events.publish(
      new RepairStatusChangedEvent({
        id: record.id,
        assetId: record.assetId,
        from: fromStatus,
        to: record.status,
        changedByUserId: command.changedByUserId,
      }),
    );
    if (record.status === 'Completed' || record.status === 'Failed') {
      this.events.publish(
        new RepairCompletedEvent({
          id: record.id,
          assetId: record.assetId,
          outcome: record.status,
          actualCostCents: record.actualCostCents,
          technicianUserId: record.technicianUserId,
        }),
      );
    } else if (record.status === 'BeyondRepair') {
      this.events.publish(
        new RepairBeyondRepairEvent({
          id: record.id,
          assetId: record.assetId,
          reason: command.note ?? record.resolutionNotes ?? null,
        }),
      );
    }
    return record;
  }
}
