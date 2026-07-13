import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AssetStatus, ALL_ASSET_STATUSES } from '../../domain/value-objects/asset-status';

export class ChangeAssetStatusDto {
  @IsEnum(ALL_ASSET_STATUSES)
  toStatus!: AssetStatus;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsUUID()
  newHolderId?: string | null;
}
