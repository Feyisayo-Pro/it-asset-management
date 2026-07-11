import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus, ALL_ASSET_STATUSES } from '../../domain/value-objects/asset-status';
import { AssetSortField } from '../../domain/repositories/asset.repository';

export class ListAssetsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) @IsOptional() pageSize: number = 20;

  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ALL_ASSET_STATUSES) status?: AssetStatus;
  @IsOptional() @IsString() deviceType?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsUUID() currentHolderId?: string;

  @IsOptional() @IsEnum(['assetTag', 'serialNumber', 'status', 'createdAt'])
  sortField?: AssetSortField;
  @IsOptional() @IsEnum(['asc', 'desc']) sortDirection?: 'asc' | 'desc';
}
