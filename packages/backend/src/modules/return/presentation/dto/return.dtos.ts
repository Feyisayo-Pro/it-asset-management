import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ALL_ASSESSMENT_OUTCOMES,
  ALL_RETURN_ITEM_STATUSES,
  ALL_RETURN_ITEM_TYPES,
  ALL_RETURN_REASONS,
  AssessmentOutcome,
  ReturnItemStatus,
  ReturnItemType,
  ReturnReason,
} from '../../domain/value-objects/return-enums';

export class InitiateReturnDto {
  @IsUUID()
  assetId!: string;

  @IsEnum(ALL_RETURN_REASONS)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonNotes?: string;
}

export class ReturnItemDto {
  @IsEnum(ALL_RETURN_ITEM_TYPES)
  itemType!: ReturnItemType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsEnum(ALL_RETURN_ITEM_STATUSES)
  status!: ReturnItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RecordItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}

export class CompleteAssessmentDto {
  @IsString()
  @MaxLength(5000)
  findings!: string;

  @IsEnum(ALL_ASSESSMENT_OUTCOMES)
  outcome!: AssessmentOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  damageNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  missingAccessories?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class SignReturnDto {
  @IsEnum(['sign-employee', 'sign-it', 'sign-pc'])
  actionName!: 'sign-employee' | 'sign-it' | 'sign-pc';

  @IsString()
  @MaxLength(255)
  signatureName!: string;
}

export class CancelReturnDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ListReturnsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) @IsOptional() pageSize: number = 20;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsUUID() assetId?: string;
}
