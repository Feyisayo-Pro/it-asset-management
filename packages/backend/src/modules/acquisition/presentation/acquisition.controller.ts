import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { AcquisitionService } from '../acquisition.service';
import {
  CreateAcquisitionDto,
  UpdateAcquisitionDto,
  ListAcquisitionsQuery,
} from './dto/acquisition.dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Controller('acquisitions')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
)
export class AcquisitionController {
  constructor(private readonly service: AcquisitionService) {}

  @Get()
  @RequirePermissions(Permission.AcquisitionRead)
  async list(@Query() q: ListAcquisitionsQuery) {
    return this.service.list({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      vendorId: q.vendorId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.AcquisitionRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.AcquisitionManage)
  async create(
    @Body() dto: CreateAcquisitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AcquisitionManage)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcquisitionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.AcquisitionManage)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
