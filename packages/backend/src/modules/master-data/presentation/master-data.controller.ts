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
import { MasterDataService } from '../master-data.service';
import { CreateMasterDataDto, UpdateMasterDataDto } from './dto/master-data.dto';

const VALID_CATEGORIES = ['departments', 'offices', 'device-types', 'brands'];

@Controller('admin/master-data')
@Roles(RoleName.SUPER_ADMIN)
@RequirePermissions(Permission.MasterDataManage)
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  @Get(':category')
  async list(
    @Param('category') category: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    this.validateCategory(category);
    return this.service.list(category, includeInactive === 'true');
  }

  @Post(':category')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('category') category: string,
    @Body() dto: CreateMasterDataDto,
  ) {
    this.validateCategory(category);
    return this.service.create(category, dto.name);
  }

  @Patch(':category/:id')
  async update(
    @Param('category') category: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMasterDataDto,
  ) {
    this.validateCategory(category);
    return this.service.update(category, id, dto);
  }

  @Delete(':category/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('category') category: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.validateCategory(category);
    await this.service.remove(category, id);
  }

  private validateCategory(category: string): void {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
    }
  }
}
