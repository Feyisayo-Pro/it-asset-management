import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';

@Injectable()
export class GetAssetUseCase {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository) {}

  async byId(id: string): Promise<Asset> {
    const found = await this.assets.findById(id);
    if (!found) throw new AssetNotFoundError(id);
    return found;
  }

  async byTag(tag: string): Promise<Asset> {
    const found = await this.assets.findByTag(tag);
    if (!found) throw new AssetNotFoundError(tag);
    return found;
  }
}
