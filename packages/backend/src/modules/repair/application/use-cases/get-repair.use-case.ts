import { Inject, Injectable } from '@nestjs/common';
import {
  REPAIR_REPOSITORY,
  RepairRepository,
  ListRepairsParams,
  ListRepairsResult,
} from '../../domain/repositories/repair.repository';
import { RepairRecord, RepairStatusHistoryProps } from '../../domain/entities/repair-record.entity';
import { RepairNotFoundError } from '../../../../common/errors/repair.errors';

@Injectable()
export class GetRepairUseCase {
  constructor(
    @Inject(REPAIR_REPOSITORY) private readonly repairs: RepairRepository,
  ) {}

  async byId(id: string): Promise<{ record: RepairRecord; history: RepairStatusHistoryProps[] }> {
    const record = await this.repairs.findById(id);
    if (!record) throw new RepairNotFoundError(id);
    const history = await this.repairs.listStatusHistory(id);
    return { record, history };
  }

  list(params: ListRepairsParams): Promise<ListRepairsResult> {
    return this.repairs.list(params);
  }

  listForAsset(assetId: string): Promise<RepairRecord[]> {
    return this.repairs.listByAssetId(assetId);
  }
}
