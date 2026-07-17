import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { EnterpriseDashboardService } from '../application/enterprise-dashboard.service';
import { DashboardFiltersQuery } from './dto/dashboard.dtos';

@Controller('dashboard')
export class EnterpriseDashboardController {
  constructor(
    private readonly dashboardService: EnterpriseDashboardService,
  ) {}

  @Get('enterprise')
  @RequirePermissions('dashboard:read')
  getDashboard(
    @Query() filters: DashboardFiltersQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboardService.getDashboard(filters, {
      userId: user.id,
      roleName: user.roleName,
    });
  }

  @Get('enterprise/filter-options')
  @RequirePermissions('dashboard:read')
  getFilterOptions() {
    return this.dashboardService.getFilterOptions();
  }
}
