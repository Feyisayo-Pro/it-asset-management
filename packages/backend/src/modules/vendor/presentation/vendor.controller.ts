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
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { VendorService } from '../vendor.service';
import { CreateVendorDto, UpdateVendorDto, ListVendorsQuery } from './dto/vendor.dto';

@Controller('vendors')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
)
export class VendorController {
  constructor(private readonly service: VendorService) {}

  @Get()
  @RequirePermissions(Permission.VendorRead)
  async list(@Query() q: ListVendorsQuery) {
    return this.service.list({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.VendorRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.VendorManage)
  async create(@Body() dto: CreateVendorDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.VendorManage)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.VendorManage)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
