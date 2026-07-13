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
  ALL_CONTEXT_TYPES,
  ALL_ITEM_RESULTS,
  AssessmentContextType,
  AssessmentOutcome,
  ItemResult,
} from '../../domain/value-objects/assessment-enums';

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
}

export class ListAssessmentsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) @IsOptional() pageSize: number = 20;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsEnum(['Draft', 'Completed']) status?: 'Draft' | 'Completed';
  @IsOptional() @IsEnum(ALL_CONTEXT_TYPES) contextType?: AssessmentContextType;
  @IsOptional() @IsString() @MaxLength(64) contextId?: string;
}
