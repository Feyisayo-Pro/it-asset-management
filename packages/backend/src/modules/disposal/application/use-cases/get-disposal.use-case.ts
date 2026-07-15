import { Inject, Injectable } from '@nestjs/common';
import {
  DISPOSAL_REPOSITORY,
  DisposalRepository,
  ListDisposalsParams,
  ListDisposalsResult,
} from '../../domain/repositories/disposal.repository';
import { DisposalRecord } from '../../domain/entities/disposal-record.entity';
import { DisposalNotFoundError } from '../../../../common/errors/disposal.errors';

@Injectable()
export class GetDisposalUseCase {
  constructor(
    @Inject(DISPOSAL_REPOSITORY) private readonly disposals: DisposalRepository,
  ) {}

  async byId(id: string): Promise<DisposalRecord> {
    const record = await this.disposals.findById(id);
    if (!record) throw new DisposalNotFoundError(id);
    return record;
  }

  list(params: ListDisposalsParams): Promise<ListDisposalsResult> {
    return this.disposals.list(params);
  }

  listForAsset(assetId: string): Promise<DisposalRecord[]> {
    return this.disposals.listByAssetId(assetId);
  }
}
