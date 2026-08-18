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
import { StartAssessmentUseCase } from '../application/use-cases/start-assessment.use-case';
import { SaveAssessmentResultsUseCase } from '../application/use-cases/save-assessment-results.use-case';
import { CompleteAssessmentRecordUseCase } from '../application/use-cases/complete-assessment-record.use-case';
import { GetAssessmentUseCase } from '../application/use-cases/get-assessment.use-case';
import {
  CompleteAssessmentRecordDto,
  ListAssessmentsQuery,
  SaveResultsDto,
  StartAssessmentDto,
} from './dto/assessment.dtos';
import { toAssessmentDto, toTemplateDto } from './dto/assessment.mapper';

@Controller('assessments')
export class AssessmentController {
  constructor(
    private readonly startAssessment: StartAssessmentUseCase,
    private readonly saveResults: SaveAssessmentResultsUseCase,
    private readonly completeRecord: CompleteAssessmentRecordUseCase,
    private readonly getAssessment: GetAssessmentUseCase,
  ) {}

  @Get('templates')
  @RequirePermissions(Permission.AssessmentRead)
  async templates() {
    const list = await this.getAssessment.listTemplates();
    return list.map(toTemplateDto);
  }

  @Get()
  @RequirePermissions(Permission.AssessmentRead)
  async list(@Query() q: ListAssessmentsQuery) {
    const result = await this.getAssessment.list({
      page: q.page,
      pageSize: q.pageSize,
      assetId: q.assetId,
      status: q.status,
      contextType: q.contextType,
      contextId: q.contextId,
    });
    return {
      data: result.data.map(toAssessmentDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.AssessmentRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const { record, template, suggestedOutcome } =
      await this.getAssessment.byId(id);
    return {
      ...toAssessmentDto(record),
      template: toTemplateDto(template),
      suggestedOutcome,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.AssessmentManage)
  async start(
    @Body() dto: StartAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.startAssessment.execute({
      assetId: dto.assetId,
      technicianUserId: user.id,
      contextType: dto.contextType,
      contextId: dto.contextId,
      templateKey: dto.templateKey,
    });
    return toAssessmentDto(record);
  }

  @Patch(':id/results')
  @RequirePermissions(Permission.AssessmentManage)
  async patchResults(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveResultsDto,
  ) {
    const record = await this.saveResults.execute({
      assessmentId: id,
      entries: dto.entries,
    });
    return toAssessmentDto(record);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AssessmentManage)
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteAssessmentRecordDto,
  ) {
    const { record, specWarnings } = await this.completeRecord.execute({
      assessmentId: id,
      outcome: dto.outcome,
      findings: dto.findings,
      recommendations: dto.recommendations,
      photoUrls: dto.photoUrls,
      signatureName: dto.signatureName,
      targetRoleLevel: dto.targetRoleLevel,
      deviceSpec:
        dto.deviceCpuTier && dto.deviceRamGb != null && dto.deviceStorageGb != null
          ? { cpuTier: dto.deviceCpuTier, ramGb: dto.deviceRamGb, storageGb: dto.deviceStorageGb }
          : undefined,
    });
    return { ...toAssessmentDto(record), specWarnings };
  }
}
