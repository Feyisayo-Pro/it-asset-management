import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DepartmentOrmEntity,
  OfficeOrmEntity,
  DeviceTypeOrmEntity,
  BrandOrmEntity,
} from './infrastructure/typeorm-entities/master-data.orm-entity';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './presentation/master-data.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DepartmentOrmEntity,
      OfficeOrmEntity,
      DeviceTypeOrmEntity,
      BrandOrmEntity,
    ]),
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
