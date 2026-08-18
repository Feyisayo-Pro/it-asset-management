import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus, ALL_ASSET_STATUSES } from '../../domain/value-objects/asset-status';
import { AssetSortField } from '../../domain/repositories/asset.repository';

export class ListAssetsQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @Type(() => Number) @IsInt() @Min(1) @Max(500) @IsOptional() pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Free-text match against asset tag, serial number, IMEI, brand, and model',
    example: 'AST-2026',
  })
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ enum: ALL_ASSET_STATUSES })
  @IsOptional() @IsEnum(ALL_ASSET_STATUSES) status?: AssetStatus;

  @ApiPropertyOptional({ example: 'Laptop' })
  @IsOptional() @IsString() deviceType?: string;

  @ApiPropertyOptional({ example: 'Dell' })
  @IsOptional() @IsString() brand?: string;

  @ApiPropertyOptional({ description: 'Exact match', example: 'Engineering' })
  @IsOptional() @IsString() department?: string;

  @ApiPropertyOptional({ description: 'Exact match', example: 'HQ - Lagos' })
  @IsOptional() @IsString() officeLocation?: string;

  @ApiPropertyOptional({ description: 'Filter to assets currently held by this user' })
  @IsOptional() @IsUUID() currentHolderId?: string;

  @ApiPropertyOptional({ enum: ['assetTag', 'serialNumber', 'status', 'createdAt'] })
  @IsOptional() @IsEnum(['assetTag', 'serialNumber', 'status', 'createdAt'])
  sortField?: AssetSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsEnum(['asc', 'desc']) sortDirection?: 'asc' | 'desc';
}
