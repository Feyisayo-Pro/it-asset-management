import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALL_ASSESSMENT_OUTCOMES,
  ALL_CONTEXT_TYPES,
  ALL_ITEM_RESULTS,
  AssessmentContextType,
  AssessmentOutcome,
  ItemResult,
} from '../../domain/value-objects/assessment-enums';
import {
  ALL_CPU_TIERS,
  ALL_ROLE_LEVELS,
  CpuTier,
  RoleLevel,
} from '../../../asset/domain/services/hardware-spec-validator';

export class StartAssessmentDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsEnum(ALL_CONTEXT_TYPES)
  contextType?: AssessmentContextType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contextId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateKey?: string;
}

export class ItemResultDto {
  @IsString()
  @MaxLength(64)
  itemCode!: string;

  @IsEnum(ALL_ITEM_RESULTS)
  result!: ItemResult;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class SaveResultsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ItemResultDto)
  entries!: ItemResultDto[];
}

export class CompleteAssessmentRecordDto {
  @IsEnum(ALL_ASSESSMENT_OUTCOMES)
  outcome!: AssessmentOutcome;

  @IsString()
  @MaxLength(5000)
  findings!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  recommendations?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsString()
  @MaxLength(255)
  signatureName!: string;

  @ApiPropertyOptional({
    description:
      'Only consulted when this assessment\'s contextType is Allocation — runs HardwareSpecValidator against the target role level\'s minimum spec (per the client IT Hardware Specifications Matrix, docs/22-sapphire-virtual-source-data.md) and returns soft warnings. Omit to skip the check.',
    enum: ALL_ROLE_LEVELS,
  })
  @IsOptional()
  @IsEnum(ALL_ROLE_LEVELS)
  targetRoleLevel?: RoleLevel;

  @ApiPropertyOptional({ enum: ALL_CPU_TIERS })
  @IsOptional()
  @IsEnum(ALL_CPU_TIERS)
  deviceCpuTier?: CpuTier;

  @ApiPropertyOptional({ minimum: 0, example: 16 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deviceRamGb?: number;

  @ApiPropertyOptional({ minimum: 0, example: 512 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deviceStorageGb?: number;

  @ApiPropertyOptional({
    description:
      'Required to proceed when the spec check finds the device below the target role level\'s minimum. Ignored if the device is compliant.',
  })
  @IsOptional()
  @IsBoolean()
  specNonComplianceOverride?: boolean;

  @ApiPropertyOptional({
    description: 'Required when specNonComplianceOverride is used.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specOverrideJustification?: string;
}

export class ListAssessmentsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) @IsOptional() pageSize: number = 20;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsEnum(['Draft', 'Completed']) status?: 'Draft' | 'Completed';
  @IsOptional() @IsEnum(ALL_CONTEXT_TYPES) contextType?: AssessmentContextType;
  @IsOptional() @IsString() @MaxLength(64) contextId?: string;
}
