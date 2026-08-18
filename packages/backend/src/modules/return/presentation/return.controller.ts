import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { InitiateReturnUseCase } from '../application/use-cases/initiate-return.use-case';
import { RecordReturnItemsUseCase } from '../application/use-cases/record-return-items.use-case';
import { CompleteAssessmentUseCase } from '../application/use-cases/complete-assessment.use-case';
import { SignReturnUseCase } from '../application/use-cases/sign-return.use-case';
import { GetReturnUseCase } from '../application/use-cases/get-return.use-case';
import {
  CancelReturnDto,
  CompleteAssessmentDto,
  InitiateReturnDto,
  ListReturnsQuery,
  RecordItemsDto,
  SignReturnDto,
} from './dto/return.dtos';
import { toReturnDto } from './dto/return.mapper';

@Controller('returns')
export class ReturnController {
  constructor(
    private readonly initiateReturn: InitiateReturnUseCase,
    private readonly recordItems: RecordReturnItemsUseCase,
    private readonly completeAssessment: CompleteAssessmentUseCase,
    private readonly signReturn: SignReturnUseCase,
    private readonly getReturn: GetReturnUseCase,
  ) {}

  @Get()
  async list(
    @Query() q: ListReturnsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Employees only see returns they initiated or that concern them.
    const scopeToSelf = user.roleName === RoleName.EMPLOYEE;
    const result = await this.getReturn.list({
      page: q.page,
      pageSize: q.pageSize,
      state: q.state,
      assetId: q.assetId,
      initiatedByUserId: scopeToSelf ? user.id : undefined,
    });
    return {
      data: result.data.map(toReturnDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  async byId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { record, workflow } = await this.getReturn.byId(id, user.roleName);
    return {
      ...toReturnDto(record),
      workflow: workflow
        ? {
            instanceId: workflow.instance.id,
            currentState: workflow.instance.currentState,
            completedAt: workflow.instance.completedAt?.toISOString() ?? null,
            availableActions: workflow.availableActions,
            stages: workflow.definition.stages,
            history: workflow.history.map((h) => ({
              fromState: h.fromState,
              toState: h.toState,
              actionName: h.actionName,
              actorUserId: h.actorUserId,
              signatureName: h.signatureName,
              comment: h.comment,
              occurredAt: h.occurredAt.toISOString(),
            })),
          }
        : null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleName.EMPLOYEE, RoleName.PEOPLE_CULTURE, RoleName.SUPER_ADMIN)
  async initiate(
    @Body() dto: InitiateReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.initiateReturn.execute({
      assetId: dto.assetId,
      reason: dto.reason,
      reasonNotes: dto.reasonNotes,
      actorUserId: user.id,
      actorRole: user.roleName,
    });
    return toReturnDto(record);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.IT_REP, RoleName.STORES_OFFICER, RoleName.SUPER_ADMIN)
  async items(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.recordItems.execute({
      returnId: id,
      actorUserId: user.id,
      actorRole: user.roleName,
      items: dto.items,
    });
    return toReturnDto(record);
  }

  @Post(':id/assessment')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.IT_REP, RoleName.SUPER_ADMIN)
  async assessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.completeAssessment.execute({
      returnId: id,
      actorUserId: user.id,
      actorRole: user.roleName,
      findings: dto.findings,
      outcome: dto.outcome,
      damageNotes: dto.damageNotes,
      missingAccessories: dto.missingAccessories,
      photoUrls: dto.photoUrls,
    });
    return toReturnDto(record);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Which role may execute which sign action is enforced by the
    // workflow definition — no role gate here beyond authentication.
    const record = await this.signReturn.execute({
      returnId: id,
      actionName: dto.actionName,
      actorUserId: user.id,
      actorRole: user.roleName,
      signatureName: dto.signatureName,
    });
    return toReturnDto(record);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.PEOPLE_CULTURE, RoleName.SUPER_ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.signReturn.execute({
      returnId: id,
      actionName: 'cancel',
      actorUserId: user.id,
      actorRole: user.roleName,
      comment: dto.reason,
    });
    return toReturnDto(record);
  }
}
