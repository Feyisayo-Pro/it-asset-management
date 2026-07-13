import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Inject } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../domain/repositories/audit-log.repository';

class AuditQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  pageSize: number = 20;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? new Date(value) : value))
  from?: Date;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? new Date(value) : value))
  to?: Date;
}
// silence unused-import warning for enum decorators kept for future use
void IsEnum;

@Controller('audit-logs')
@Roles(RoleName.SUPER_ADMIN)
@RequirePermissions(Permission.AuditRead)
export class AuditController {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly repo: AuditLogRepository,
  ) {}

  @Get()
  async list(@Query() q: AuditQueryDto) {
    const result = await this.repo.query({
      page: q.page,
      pageSize: q.pageSize,
      userId: q.userId,
      entityType: q.entityType,
      entityId: q.entityId,
      action: q.action,
      from: q.from,
      to: q.to,
    });
    return {
      data: result.data.map((e) => ({
        id: e.id,
        userId: e.userId,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        oldValue: e.oldValue,
        newValue: e.newValue,
        ip: e.ip,
        userAgent: e.userAgent,
        correlationId: e.correlationId,
        occurredAt: e.occurredAt.toISOString(),
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.repo.findById(id);
    if (!entry) return null;
    return {
      id: entry.id,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ip: entry.ip,
      userAgent: entry.userAgent,
      correlationId: entry.correlationId,
      occurredAt: entry.occurredAt.toISOString(),
    };
  }
}
