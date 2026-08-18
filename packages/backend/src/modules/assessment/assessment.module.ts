import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssessmentItemResultOrmEntity,
  AssessmentRecordOrmEntity,
  AssessmentTemplateItemOrmEntity,
  AssessmentTemplateOrmEntity,
} from './infrastructure/typeorm-entities/assessment.orm-entities';
import {
  TypeOrmAssessmentRecordRepository,
  TypeOrmAssessmentTemplateRepository,
} from './infrastructure/repositories/typeorm-assessment.repositories';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
} from './domain/repositories/assessment.repositories';
import { StartAssessmentUseCase } from './application/use-cases/start-assessment.use-case';
import { SaveAssessmentResultsUseCase } from './application/use-cases/save-assessment-results.use-case';
import { CompleteAssessmentRecordUseCase } from './application/use-cases/complete-assessment-record.use-case';
import { GetAssessmentUseCase } from './application/use-cases/get-assessment.use-case';
import { AssessmentController } from './presentation/assessment.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AssetModule } from '../asset/asset.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssessmentTemplateOrmEntity,
      AssessmentTemplateItemOrmEntity,
      AssessmentRecordOrmEntity,
      AssessmentItemResultOrmEntity,
    ]),
    CommonModule,
    AuthModule, // CLOCK + ID_GENERATOR
    AssetModule, // ASSET_REPOSITORY (asset existence check)
  ],
  controllers: [AssessmentController],
  providers: [
    { provide: ASSESSMENT_TEMPLATE_REPOSITORY, useClass: TypeOrmAssessmentTemplateRepository },
    { provide: ASSESSMENT_RECORD_REPOSITORY, useClass: TypeOrmAssessmentRecordRepository },
    StartAssessmentUseCase,
    SaveAssessmentResultsUseCase,
    CompleteAssessmentRecordUseCase,
    GetAssessmentUseCase,
  ],
  // Exported so Allocation / Return / Repair modules can start
  // assessments in their own flows and read outcomes.
  exports: [StartAssessmentUseCase, GetAssessmentUseCase],
})
export class AssessmentModule {}
