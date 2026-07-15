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
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { OpenRepairUseCase } from '../application/use-cases/open-repair.use-case';
import { UpdateRepairUseCase } from '../application/use-cases/update-repair.use-case';
import { TransitionRepairUseCase } from '../application/use-cases/transition-repair.use-case';
import { GetRepairUseCase } from '../application/use-cases/get-repair.use-case';
import {
  ListRepairsQuery,
  OpenRepairDto,
  TransitionRepairDto,
  UpdateRepairDto,
} from './dto/repair.dtos';
import { toRepairDto, toRepairHistoryDto } from './dto/repair.mapper';

@Controller('repairs')
export class RepairController {
  constructor(
    private readonly openRepair: OpenRepairUseCase,
    private readonly updateRepair: UpdateRepairUseCase,
    private readonly transitionRepair: TransitionRepairUseCase,
    private readonly getRepair: GetRepairUseCase,
  ) {}

  @Get()
  @RequirePermissions(Permission.RepairRead)
  async list(@Query() q: ListRepairsQuery) {
    const result = await this.getRepair.list({
      page: q.page,
      pageSize: q.pageSize,
      assetId: q.assetId,
      status: q.status,
      technicianUserId: q.technicianUserId,
    });
    return {
      data: result.data.map(toRepairDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.RepairRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const { record, history } = await this.getRepair.byId(id);
    return { ...toRepairDto(record), history: history.map(toRepairHistoryDto) };
  }

  @Get('by-asset/:assetId')
  @RequirePermissions(Permission.RepairRead)
  async listForAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    const rows = await this.getRepair.listForAsset(assetId);
    return rows.map(toRepairDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.RepairManage)
  async open(
    @Body() dto: OpenRepairDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.openRepair.execute({
      assetId: dto.assetId,
      reportedFault: dto.reportedFault,
      createdByUserId: user.id,
      employeeUserId: dto.employeeUserId,
      technicianUserId: dto.technicianUserId,
      vendor: dto.vendor,
      estimatedCost: dto.estimatedCost,
      costCurrency: dto.costCurrency,
    });
    return toRepairDto(record);
  }

  @Patch(':id')
  @RequirePermissions(Permission.RepairManage)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRepairDto,
  ) {
    const record = await this.updateRepair.execute({
      repairId: id,
      technicianUserId: dto.technicianUserId,
      vendor: dto.vendor,
      estimatedCost: dto.estimatedCost,
    });
    return toRepairDto(record);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.RepairManage)
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionRepairDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.transitionRepair.execute({
      repairId: id,
      toStatus: dto.toStatus,
      changedByUserId: user.id,
      diagnosis: dto.diagnosis,
      resolutionNotes: dto.resolutionNotes,
      actualCost: dto.actualCost,
      note: dto.note,
    });
    return toRepairDto(record);
  }
}
