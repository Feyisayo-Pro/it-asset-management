import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { ComplianceService } from '../compliance.service';
import { ListBreachesQuery } from './dto/compliance.dto';

@Controller('compliance')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
  RoleName.PEOPLE_CULTURE,
)
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.ComplianceRead)
  async dashboard() {
    return this.service.getDashboard();
  }

  @Get('breaches')
  @RequirePermissions(Permission.ComplianceRead)
  async listBreaches(@Query() q: ListBreachesQuery) {
    return this.service.listBreaches({
      page: q.page,
      pageSize: q.pageSize,
      definitionKey: q.definitionKey,
      resolved: q.resolved,
    });
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ComplianceManage)
  async runScan() {
    const detected = await this.service.detectBreaches();
    const resolved = await this.service.resolveBreaches();
    return { detected, resolved };
  }
}
