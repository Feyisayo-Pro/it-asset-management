import { Module } from '@nestjs/common';
import { EnterpriseDashboardService } from './application/enterprise-dashboard.service';
import { EnterpriseDashboardController } from './presentation/enterprise-dashboard.controller';

@Module({
  controllers: [EnterpriseDashboardController],
  providers: [EnterpriseDashboardService],
})
export class DashboardModule {}
