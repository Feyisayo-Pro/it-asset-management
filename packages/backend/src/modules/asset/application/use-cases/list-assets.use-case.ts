import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY,
  AssetRepository,
  ListAssetsParams,
  ListAssetsResult,
} from '../../domain/repositories/asset.repository';

@Injectable()
export class ListAssetsUseCase {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository) {}

  execute(params: ListAssetsParams): Promise<ListAssetsResult> {
    return this.assets.list(params);
  }
}
