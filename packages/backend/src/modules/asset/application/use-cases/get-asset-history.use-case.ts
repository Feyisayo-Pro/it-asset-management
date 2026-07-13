import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';

@Injectable()
export class GetAssetHistoryUseCase {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository) {}

  async execute(assetId: string): Promise<AssetStatusHistory[]> {
    const asset = await this.assets.findById(assetId);
    if (!asset) throw new AssetNotFoundError(assetId);
    return this.assets.listStatusHistory(assetId);
  }
}
