import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRecordOrmEntity } from './infrastructure/typeorm-entities/return-record.orm-entity';
import { ReturnItemOrmEntity } from './infrastructure/typeorm-entities/return-item.orm-entity';
import { TypeOrmReturnRepository } from './infrastructure/repositories/typeorm-return.repository';
import { RETURN_REPOSITORY } from './domain/repositories/return.repository';
import { InitiateReturnUseCase } from './application/use-cases/initiate-return.use-case';
import { RecordReturnItemsUseCase } from './application/use-cases/record-return-items.use-case';
import { CompleteAssessmentUseCase } from './application/use-cases/complete-assessment.use-case';
import { SignReturnUseCase } from './application/use-cases/sign-return.use-case';
import { GetReturnUseCase } from './application/use-cases/get-return.use-case';
import { ReturnWorkflowCompletedHandler } from './application/handlers/return-workflow-completed.handler';
import { ReturnController } from './presentation/return.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AssetModule } from '../asset/asset.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRecordOrmEntity, ReturnItemOrmEntity]),
    CommonModule,
    AuthModule, // CLOCK + ID_GENERATOR
    AssetModule, // ASSET_REPOSITORY + ChangeAssetStatusUseCase
    WorkflowModule, // Create/Transition/GetState use cases
  ],
  controllers: [ReturnController],
  providers: [
    { provide: RETURN_REPOSITORY, useClass: TypeOrmReturnRepository },
    InitiateReturnUseCase,
    RecordReturnItemsUseCase,
    CompleteAssessmentUseCase,
    SignReturnUseCase,
    GetReturnUseCase,
    ReturnWorkflowCompletedHandler,
  ],
})
export class ReturnModule {}
