import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { AllocationService } from '../allocation.service';
import {
  CreateAllocationDto,
  AssignAssetDto,
  TransitionAllocationDto,
  ListAllocationsQuery,
} from './dto/allocation.dto';

@Controller('allocations')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
  RoleName.PEOPLE_CULTURE,
  RoleName.EMPLOYEE,
)
export class AllocationController {
  constructor(private readonly service: AllocationService) {}

  @Get()
  @RequirePermissions(Permission.AllocationRead)
  async list(@Query() q: ListAllocationsQuery) {
    return this.service.list({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      status: q.status,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.AllocationRead)
  async byId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getById(id, user.roleName);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.AllocationManage)
  async create(
    @Body() dto: CreateAllocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create({
      employeeId: dto.employeeId,
      justification: dto.justification,
      requestedBy: user.id,
    });
  }

  @Patch(':id/assign-asset')
  @RequirePermissions(Permission.AllocationManage)
  async assignAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAssetDto,
  ) {
    await this.service.assignAsset(id, dto.assetId);
    return { ok: true };
  }

  @Post(':id/transition')
  @RequirePermissions(Permission.AllocationRead)
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionAllocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transition(id, {
      actionName: dto.actionName,
      actorUserId: user.id,
      actorRole: user.roleName,
      signatureName: dto.signatureName,
      comment: dto.comment,
    });
  }
}
