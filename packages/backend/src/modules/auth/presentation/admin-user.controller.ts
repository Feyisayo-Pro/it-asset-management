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
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { AdminCreateUserDto } from './dto/admin/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin/update-user.dto';
import { AdminChangeRoleDto } from './dto/admin/change-role.dto';
import { ListUsersQuery } from './dto/admin/list-users.query';
import { AdminUserDto, toAdminUserDto } from './dto/admin/user.mapper';
import { CreateUserUseCase } from '../application/use-cases/admin/create-user.use-case';
import { UpdateUserUseCase } from '../application/use-cases/admin/update-user.use-case';
import { ChangeUserRoleUseCase } from '../application/use-cases/admin/change-user-role.use-case';
import { DeactivateUserUseCase } from '../application/use-cases/admin/deactivate-user.use-case';
import { ActivateUserUseCase } from '../application/use-cases/admin/activate-user.use-case';
import { ListUsersUseCase } from '../application/use-cases/admin/list-users.use-case';
import { GetUserUseCase } from '../application/use-cases/admin/get-user.use-case';

interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Controller('admin/users')
@Roles(RoleName.SUPER_ADMIN)
@RequirePermissions(Permission.UserManage)
export class AdminUserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly changeRole: ChangeUserRoleUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
    private readonly activateUser: ActivateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListUsersQuery,
  ): Promise<PagedResponse<AdminUserDto>> {
    const result = await this.listUsers.execute({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      roleId: query.roleId,
      isActive: query.isActive,
      sort: query.sortField
        ? {
            field: query.sortField,
            direction: query.sortDirection ?? 'asc',
          }
        : undefined,
    });
    return {
      data: result.data.map(toAdminUserDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserDto> {
    const user = await this.getUser.execute(id);
    return toAdminUserDto(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: AdminCreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const user = await this.createUser.execute({
      actorUserId: actor.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      roleId: dto.roleId,
      password: dto.password,
      mustChangePassword: dto.mustChangePassword,
    });
    return toAdminUserDto(user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const user = await this.updateUser.execute({
      actorUserId: actor.id,
      userId: id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });
    return toAdminUserDto(user);
  }

  @Patch(':id/role')
  async changeUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminChangeRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const user = await this.changeRole.execute({
      actorUserId: actor.id,
      userId: id,
      newRoleId: dto.roleId,
    });
    return toAdminUserDto(user);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const user = await this.deactivateUser.execute({
      actorUserId: actor.id,
      userId: id,
    });
    return toAdminUserDto(user);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const user = await this.activateUser.execute({
      actorUserId: actor.id,
      userId: id,
    });
    return toAdminUserDto(user);
  }
}
