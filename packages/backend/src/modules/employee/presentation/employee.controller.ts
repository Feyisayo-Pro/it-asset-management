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
import { CreateEmployeeUseCase } from '../application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from '../application/use-cases/update-employee.use-case';
import { ChangeEmploymentStatusUseCase } from '../application/use-cases/change-employment-status.use-case';
import { GetEmployeeUseCase } from '../application/use-cases/get-employee.use-case';
import { ListEmployeesUseCase } from '../application/use-cases/list-employees.use-case';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ChangeEmploymentStatusDto } from './dto/change-employment-status.dto';
import { ListEmployeesQuery } from './dto/list-employees.query';
import { toEmployeeDto } from './dto/employee.mapper';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Controller('employees')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
  RoleName.PEOPLE_CULTURE,
  RoleName.EMPLOYEE,
)
export class EmployeeController {
  constructor(
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
    private readonly changeStatus: ChangeEmploymentStatusUseCase,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly listEmployees: ListEmployeesUseCase,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  @Get()
  @RequirePermissions(Permission.EmployeeRead)
  async list(@Query() q: ListEmployeesQuery) {
    const result = await this.listEmployees.execute({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      department: q.department,
      officeLocation: q.officeLocation,
      employmentStatus: q.employmentStatus,
      sort: q.sortField
        ? { field: q.sortField, direction: q.sortDirection ?? 'asc' }
        : undefined,
    });
    return {
      data: result.data.map(toEmployeeDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get('me')
  async myProfile(@CurrentUser() user: AuthenticatedUser) {
    const employee = await this.getEmployee.byUserId(user.id);
    return employee ? toEmployeeDto(employee) : null;
  }

  @Get(':id')
  @RequirePermissions(Permission.EmployeeRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const employee = await this.getEmployee.byId(id);
    return toEmployeeDto(employee);
  }

  @Get(':id/assets')
  @RequirePermissions(Permission.EmployeeRead)
  async assignedAssets(@Param('id', ParseUUIDPipe) id: string) {
    const employee = await this.getEmployee.byId(id);
    const holderId = employee.userId ?? employee.id;
    const rows = await this.em.query(
      `SELECT a."id", a."asset_tag", a."device_type", a."brand", a."model",
              a."serial_number", a."status", a."created_at"
       FROM "assets" a
       WHERE a."current_holder_id" = $1
       ORDER BY a."created_at" DESC`,
      [holderId],
    );
    return rows;
  }

  @Get(':id/history')
  @RequirePermissions(Permission.EmployeeRead)
  async assetHistory(@Param('id', ParseUUIDPipe) id: string) {
    const employee = await this.getEmployee.byId(id);
    const holderId = employee.userId ?? employee.id;
    const rows = await this.em.query(
      `SELECT wi."id", wd."name" AS "workflowName", wi."current_stage" AS "currentStage",
              wi."status", wi."created_at" AS "createdAt",
              a."asset_tag" AS "assetTag", a."device_type" AS "deviceType"
       FROM "workflow_instances" wi
       JOIN "workflow_definitions" wd ON wd."id" = wi."definition_id"
       LEFT JOIN "assets" a ON a."id" = wi."asset_id"
       WHERE wi."started_by_user_id" = $1
       ORDER BY wi."created_at" DESC`,
      [holderId],
    );
    return rows;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.EmployeeManage)
  async create(@Body() dto: CreateEmployeeDto) {
    const employee = await this.createEmployee.execute(dto);
    return toEmployeeDto(employee);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EmployeeManage)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const employee = await this.updateEmployee.execute({
      employeeId: id,
      ...dto,
    });
    return toEmployeeDto(employee);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.EmployeeManageStatus)
  async changeStatusAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeEmploymentStatusDto,
  ) {
    const employee = await this.changeStatus.execute({
      employeeId: id,
      status: dto.status,
      terminationDate: dto.terminationDate,
    });
    return toEmployeeDto(employee);
  }
}
