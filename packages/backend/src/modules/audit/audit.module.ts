import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogOrmEntity } from './infrastructure/typeorm-entities/audit-log.orm-entity';
import { TypeOrmAuditLogRepository } from './infrastructure/repositories/typeorm-audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditService } from './application/audit.service';
import { AuditController } from './presentation/audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogOrmEntity])],
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: TypeOrmAuditLogRepository },
  ],
  exports: [AuditService, AUDIT_LOG_REPOSITORY],
})
export class AuditModule {}
