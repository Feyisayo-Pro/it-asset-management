import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinitionOrmEntity } from './infrastructure/typeorm-entities/workflow-definition.orm-entity';
import { WorkflowStageOrmEntity } from './infrastructure/typeorm-entities/workflow-stage.orm-entity';
import { WorkflowTransitionConfigOrmEntity } from './infrastructure/typeorm-entities/workflow-transition-config.orm-entity';
import { WorkflowInstanceOrmEntity } from './infrastructure/typeorm-entities/workflow-instance.orm-entity';
import { WorkflowInstanceTransitionOrmEntity } from './infrastructure/typeorm-entities/workflow-instance-transition.orm-entity';
import { TypeOrmWorkflowDefinitionRepository } from './infrastructure/repositories/typeorm-workflow-definition.repository';
import { TypeOrmWorkflowInstanceRepository } from './infrastructure/repositories/typeorm-workflow-instance.repository';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  WORKFLOW_INSTANCE_REPOSITORY,
} from './domain/repositories/workflow.repositories';
import { CreateWorkflowInstanceUseCase } from './application/use-cases/create-workflow-instance.use-case';
import { TransitionWorkflowUseCase } from './application/use-cases/transition-workflow.use-case';
import { BypassWorkflowUseCase } from './application/use-cases/bypass-workflow.use-case';
import { GetWorkflowStateUseCase } from './application/use-cases/get-workflow-state.use-case';
import { CreateWorkflowDefinitionUseCase } from './application/use-cases/create-workflow-definition.use-case';
import { ListWorkflowDefinitionsUseCase } from './application/use-cases/list-workflow-definitions.use-case';
import { WorkflowController } from './presentation/workflow.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionOrmEntity,
      WorkflowStageOrmEntity,
      WorkflowTransitionConfigOrmEntity,
      WorkflowInstanceOrmEntity,
      WorkflowInstanceTransitionOrmEntity,
    ]),
    CommonModule,
    AuthModule, // provides CLOCK + ID_GENERATOR
  ],
  controllers: [WorkflowController],
  providers: [
    { provide: WORKFLOW_DEFINITION_REPOSITORY, useClass: TypeOrmWorkflowDefinitionRepository },
    { provide: WORKFLOW_INSTANCE_REPOSITORY, useClass: TypeOrmWorkflowInstanceRepository },
    CreateWorkflowInstanceUseCase,
    TransitionWorkflowUseCase,
    BypassWorkflowUseCase,
    GetWorkflowStateUseCase,
    CreateWorkflowDefinitionUseCase,
    ListWorkflowDefinitionsUseCase,
  ],
  exports: [
    CreateWorkflowInstanceUseCase,
    TransitionWorkflowUseCase,
    GetWorkflowStateUseCase,
  ],
})
export class WorkflowModule {}
