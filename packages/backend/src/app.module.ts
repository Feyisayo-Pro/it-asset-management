import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { loadConfiguration, RootConfig } from './config/configuration';
import { configValidationSchema } from './config/validation.schema';
import { dataSourceOptions } from './config/data-source';
import { CommonModule } from './common/common.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { AssetModule } from './modules/asset/asset.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ReturnModule } from './modules/return/return.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { RepairModule } from './modules/repair/repair.module';
import { DisposalModule } from './modules/disposal/disposal.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { AcquisitionModule } from './modules/acquisition/acquisition.module';
import { AllocationModule } from './modules/allocation/allocation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfiguration],
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: true },
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 32,
      verboseMemoryLeak: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<RootConfig, true>) => {
        const t = config.getOrThrow<RootConfig['throttle']>('throttle');
        return [
          { name: 'default', ttl: t.ttlSeconds * 1000, limit: t.limitGlobal },
        ];
      },
    }),
    CommonModule,
    AuditModule,
    RbacModule,
    AuthModule,
    AssetModule,
    WorkflowModule,
    ReturnModule,
    AssessmentModule,
    RepairModule,
    DisposalModule,
    NotificationModule,
    ReportingModule,
    DashboardModule,
    EmployeeModule,
    MasterDataModule,
    VendorModule,
    AcquisitionModule,
    AllocationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
