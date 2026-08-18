import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetOrmEntity } from './infrastructure/typeorm-entities/asset.orm-entity';
import { AssetAccessoryOrmEntity } from './infrastructure/typeorm-entities/asset-accessory.orm-entity';
import { AssetStatusHistoryOrmEntity } from './infrastructure/typeorm-entities/asset-status-history.orm-entity';
import { TypeOrmAssetRepository } from './infrastructure/repositories/typeorm-asset.repository';
import { BwipBarcodeService } from './infrastructure/services/bwip-barcode.service';
import { ASSET_REPOSITORY } from './domain/repositories/asset.repository';
import { BARCODE_SERVICE } from './application/ports/barcode.port';
import { RegisterAssetUseCase } from './application/use-cases/register-asset.use-case';
import { UpdateAssetUseCase } from './application/use-cases/update-asset.use-case';
import { ChangeAssetStatusUseCase } from './application/use-cases/change-asset-status.use-case';
import { GetAssetUseCase } from './application/use-cases/get-asset.use-case';
import { ListAssetsUseCase } from './application/use-cases/list-assets.use-case';
import { DeleteAssetUseCase } from './application/use-cases/delete-asset.use-case';
import { BulkImportAssetsUseCase } from './application/use-cases/bulk-import-assets.use-case';
import { ExportAssetsUseCase } from './application/use-cases/export-assets.use-case';
import { GetAssetHistoryUseCase } from './application/use-cases/get-asset-history.use-case';
import { AssetController } from './presentation/asset.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetOrmEntity,
      AssetAccessoryOrmEntity,
      AssetStatusHistoryOrmEntity,
    ]),
    CommonModule,
    AuthModule, // shares CLOCK + ID_GENERATOR providers
  ],
  controllers: [AssetController],
  providers: [
    { provide: ASSET_REPOSITORY, useClass: TypeOrmAssetRepository },
    { provide: BARCODE_SERVICE, useClass: BwipBarcodeService },
    RegisterAssetUseCase,
    UpdateAssetUseCase,
    ChangeAssetStatusUseCase,
    GetAssetUseCase,
    ListAssetsUseCase,
    DeleteAssetUseCase,
    BulkImportAssetsUseCase,
    ExportAssetsUseCase,
    GetAssetHistoryUseCase,
  ],
  exports: [ASSET_REPOSITORY, ChangeAssetStatusUseCase, GetAssetUseCase],
})
export class AssetModule {}
