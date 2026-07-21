import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceBreachOrmEntity } from './infrastructure/typeorm-entities/compliance-breach.orm-entity';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './presentation/compliance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComplianceBreachOrmEntity])],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
