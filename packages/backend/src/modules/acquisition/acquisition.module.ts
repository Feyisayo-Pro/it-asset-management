import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcquisitionOrmEntity } from './infrastructure/typeorm-entities/acquisition.orm-entity';
import { AssetOrmEntity } from '../asset/infrastructure/typeorm-entities/asset.orm-entity';
import { AcquisitionService } from './acquisition.service';
import { AcquisitionController } from './presentation/acquisition.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AcquisitionOrmEntity, AssetOrmEntity])],
  controllers: [AcquisitionController],
  providers: [AcquisitionService],
  exports: [AcquisitionService],
})
export class AcquisitionModule {}
