import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllocationOrmEntity } from './infrastructure/typeorm-entities/allocation.orm-entity';
import { AllocationService } from './allocation.service';
import { AllocationController } from './presentation/allocation.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AllocationOrmEntity]),
    WorkflowModule,
  ],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
