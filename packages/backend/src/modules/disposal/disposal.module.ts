import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisposalRecordOrmEntity } from './infrastructure/typeorm-entities/disposal.orm-entities';
import { TypeOrmDisposalRepository } from './infrastructure/repositories/typeorm-disposal.repository';
import { DISPOSAL_REPOSITORY } from './domain/repositories/disposal.repository';
import { RequestDisposalUseCase } from './application/use-cases/request-disposal.use-case';
import { ApproveDisposalUseCase } from './application/use-cases/approve-disposal.use-case';
import { RejectDisposalUseCase } from './application/use-cases/reject-disposal.use-case';
import { GetDisposalUseCase } from './application/use-cases/get-disposal.use-case';
import { DisposalApprovedHandler } from './application/handlers/disposal-approved.handler';
import { DisposalController } from './presentation/disposal.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AssetModule } from '../asset/asset.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisposalRecordOrmEntity]),
    CommonModule,
    AuthModule,
    AssetModule,
  ],
  controllers: [DisposalController],
  providers: [
    { provide: DISPOSAL_REPOSITORY, useClass: TypeOrmDisposalRepository },
    RequestDisposalUseCase,
    ApproveDisposalUseCase,
    RejectDisposalUseCase,
    GetDisposalUseCase,
    DisposalApprovedHandler,
  ],
  exports: [GetDisposalUseCase],
})
export class DisposalModule {}
