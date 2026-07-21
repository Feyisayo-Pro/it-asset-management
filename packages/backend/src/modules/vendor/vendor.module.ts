import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorOrmEntity } from './infrastructure/typeorm-entities/vendor.orm-entity';
import { VendorService } from './vendor.service';
import { VendorController } from './presentation/vendor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VendorOrmEntity])],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
