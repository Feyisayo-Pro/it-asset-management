import { Inject, Injectable } from '@nestjs/common';
import {
  REPAIR_REPOSITORY,
  RepairRepository,
} from '../../domain/repositories/repair.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { RepairRecord } from '../../domain/entities/repair-record.entity';
import { RepairNotFoundError } from '../../../../common/errors/repair.errors';

export interface UpdateRepairCommand {
  repairId: string;
  technicianUserId?: string | null;
  vendor?: string | null;
  estimatedCost?: number | null;
}

@Injectable()
export class UpdateRepairUseCase {
  constructor(
    @Inject(REPAIR_REPOSITORY) private readonly repairs: RepairRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateRepairCommand): Promise<RepairRecord> {
    const record = await this.repairs.findById(command.repairId);
    if (!record) throw new RepairNotFoundError(command.repairId);
    record.assign({
      technicianUserId: command.technicianUserId,
      vendor: command.vendor,
      estimatedCostCents:
        command.estimatedCost === undefined
          ? undefined
          : command.estimatedCost === null
          ? null
          : Math.round(command.estimatedCost * 100),
      now: this.clock.now(),
    });
    await this.repairs.save(record);
    return record;
  }
}
