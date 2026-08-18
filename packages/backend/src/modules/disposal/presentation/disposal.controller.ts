import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { RequestDisposalUseCase } from '../application/use-cases/request-disposal.use-case';
import { ApproveDisposalUseCase } from '../application/use-cases/approve-disposal.use-case';
import { RejectDisposalUseCase } from '../application/use-cases/reject-disposal.use-case';
import { GetDisposalUseCase } from '../application/use-cases/get-disposal.use-case';
import {
  ApproveDisposalDto,
  ListDisposalsQuery,
  RejectDisposalDto,
  RequestDisposalDto,
} from './dto/disposal.dtos';
import { toDisposalDto } from './dto/disposal.mapper';

@Controller('disposals')
export class DisposalController {
  constructor(
    private readonly requestDisposal: RequestDisposalUseCase,
    private readonly approveDisposal: ApproveDisposalUseCase,
    private readonly rejectDisposal: RejectDisposalUseCase,
    private readonly getDisposal: GetDisposalUseCase,
  ) {}

  @Get()
  @RequirePermissions(Permission.DisposalRead)
  async list(@Query() q: ListDisposalsQuery) {
    const result = await this.getDisposal.list({
      page: q.page,
      pageSize: q.pageSize,
      assetId: q.assetId,
      status: q.status,
      requestedByUserId: q.requestedByUserId,
      approvedByUserId: q.approvedByUserId,
    });
    return {
      data: result.data.map(toDisposalDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.DisposalRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const record = await this.getDisposal.byId(id);
    return toDisposalDto(record);
  }

  @Get('by-asset/:assetId')
  @RequirePermissions(Permission.DisposalRead)
  async listForAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    const rows = await this.getDisposal.listForAsset(assetId);
    return rows.map(toDisposalDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.DisposalRequest)
  async request(
    @Body() dto: RequestDisposalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.requestDisposal.execute({
      assetId: dto.assetId,
      requestedByUserId: user.id,
      reason: dto.reason,
      method: dto.method,
      requestNotes: dto.requestNotes,
      evidenceUrls: dto.evidenceUrls,
      photoUrls: dto.photoUrls,
    });
    return toDisposalDto(record);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DisposalApprove)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDisposalDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    const record = await this.approveDisposal.execute({
      disposalId: id,
      approverUserId: user.id,
      signaturePrintedName: dto.signaturePrintedName,
      signatureIp: ip,
      disposalDate: new Date(dto.disposalDate),
      witnessUserId: dto.witnessUserId,
      approvalNotes: dto.approvalNotes,
    });
    return toDisposalDto(record);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DisposalApprove)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDisposalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.rejectDisposal.execute({
      disposalId: id,
      approverUserId: user.id,
      rejectionReason: dto.rejectionReason,
    });
    return toDisposalDto(record);
  }
}
