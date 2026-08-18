import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus, ALL_ASSET_STATUSES } from '../../domain/value-objects/asset-status';

export class ChangeAssetStatusDto {
  @ApiProperty({
    enum: ALL_ASSET_STATUSES,
    description: 'Target status. Must be a legal transition from the asset\'s current status per AssetLifecycleStateMachine.',
  })
  @IsEnum(ALL_ASSET_STATUSES)
  toStatus!: AssetStatus;

  @ApiProperty({ maxLength: 500, example: 'Assigned to Ada for onboarding' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'User ID to set as the new current holder', nullable: true })
  @IsOptional()
  @IsUUID()
  newHolderId?: string | null;
}
