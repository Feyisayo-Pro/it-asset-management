import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RepairRecordOrmEntity,
  RepairStatusHistoryOrmEntity,
} from './infrastructure/typeorm-entities/repair.orm-entities';
import { TypeOrmRepairRepository } from './infrastructure/repositories/typeorm-repair.repository';
import { REPAIR_REPOSITORY } from './domain/repositories/repair.repository';
import { OpenRepairUseCase } from './application/use-cases/open-repair.use-case';
import { UpdateRepairUseCase } from './application/use-cases/update-repair.use-case';
import { TransitionRepairUseCase } from './application/use-cases/transition-repair.use-case';
import { GetRepairUseCase } from './application/use-cases/get-repair.use-case';
import { RepairCompletedHandler } from './application/handlers/repair-completed.handler';
import { RepairController } from './presentation/repair.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AssetModule } from '../asset/asset.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepairRecordOrmEntity, RepairStatusHistoryOrmEntity]),
    CommonModule,
    AuthModule,
    AssetModule,
  ],
  controllers: [RepairController],
  providers: [
    { provide: REPAIR_REPOSITORY, useClass: TypeOrmRepairRepository },
    OpenRepairUseCase,
    UpdateRepairUseCase,
    TransitionRepairUseCase,
    GetRepairUseCase,
    RepairCompletedHandler,
  ],
  exports: [GetRepairUseCase],
})
export class RepairModule {}
