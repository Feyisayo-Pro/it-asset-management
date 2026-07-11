import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { CreateWorkflowInstanceUseCase } from '../application/use-cases/create-workflow-instance.use-case';
import { TransitionWorkflowUseCase } from '../application/use-cases/transition-workflow.use-case';
import { BypassWorkflowUseCase } from '../application/use-cases/bypass-workflow.use-case';
import { GetWorkflowStateUseCase } from '../application/use-cases/get-workflow-state.use-case';
import { CreateWorkflowDefinitionUseCase } from '../application/use-cases/create-workflow-definition.use-case';
import { ListWorkflowDefinitionsUseCase } from '../application/use-cases/list-workflow-definitions.use-case';
import { BypassDto, CreateInstanceDto, TransitionDto } from './dto/transition.dto';
import { CreateWorkflowDefinitionDto } from './dto/create-definition.dto';
import { asyncContext } from '../../../common/utils/async-context';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly createInstance: CreateWorkflowInstanceUseCase,
    private readonly transitionWorkflow: TransitionWorkflowUseCase,
    private readonly bypassWorkflow: BypassWorkflowUseCase,
    private readonly getState: GetWorkflowStateUseCase,
    private readonly createDefinition: CreateWorkflowDefinitionUseCase,
    private readonly listDefinitions: ListWorkflowDefinitionsUseCase,
  ) {}

  @Get('definitions')
  @RequirePermissions(Permission.WorkflowRead)
  async listDefs() {
    const defs = await this.listDefinitions.execute();
    return defs.map((d) => ({
      id: d.id,
      key: d.key,
      version: d.version,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      initialState: d.initialState,
      finalStates: d.finalStates,
      stages: d.stages,
      transitions: d.transitions,
    }));
  }

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleName.SUPER_ADMIN)
  @RequirePermissions(Permission.WorkflowConfigure)
  async createDef(@Body() dto: CreateWorkflowDefinitionDto) {
    const created = await this.createDefinition.execute({
      ...dto,
      stages: dto.stages.map((s) => ({
        state: s.state,
        label: s.label,
        requiredRoles: s.requiredRoles,
        slaMinutes: s.slaMinutes ?? null,
        sortOrder: s.sortOrder,
      })),
      transitions: dto.transitions,
    });
    return { id: created.id, key: created.key, version: created.version };
  }

  @Post('instances')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.WorkflowTransition)
  async create(@Body() dto: CreateInstanceDto) {
    const inst = await this.createInstance.execute(dto);
    return { id: inst.id, currentState: inst.currentState };
  }

  @Get('instances/:id')
  @RequirePermissions(Permission.WorkflowRead)
  async getInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const state = await this.getState.execute(id, user.roleName);
    return {
      id: state.instance.id,
      definitionId: state.instance.definitionId,
      definitionKey: state.definition.key,
      subjectType: state.instance.subjectType,
      subjectId: state.instance.subjectId,
      currentState: state.instance.currentState,
      completedAt: state.instance.completedAt?.toISOString() ?? null,
      bypassed: state.instance.bypassed,
      availableActions: state.availableActions,
      stages: state.definition.stages,
      history: state.history.map((h) => ({
        id: h.id,
        fromState: h.fromState,
        toState: h.toState,
        actionName: h.actionName,
        actorUserId: h.actorUserId,
        signatureName: h.signatureName,
        comment: h.comment,
        occurredAt: h.occurredAt.toISOString(),
      })),
    };
  }

  @Post('instances/:id/transition')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WorkflowTransition)
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ip = asyncContext.get()?.ip;
    const inst = await this.transitionWorkflow.execute({
      instanceId: id,
      actionName: dto.actionName,
      actorUserId: user.id,
      actorRole: user.roleName,
      signatureName: dto.signatureName,
      signatureIp: ip,
      evidenceFileIds: dto.evidenceFileIds,
      comment: dto.comment,
    });
    return { id: inst.id, currentState: inst.currentState };
  }

  @Post('instances/:id/bypass')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.SUPER_ADMIN)
  @RequirePermissions(Permission.WorkflowBypass)
  async bypass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BypassDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const inst = await this.bypassWorkflow.execute({
      instanceId: id,
      actorUserId: user.id,
      toState: dto.toState,
      reason: dto.reason,
    });
    return { id: inst.id, currentState: inst.currentState, bypassed: inst.bypassed };
  }
}
