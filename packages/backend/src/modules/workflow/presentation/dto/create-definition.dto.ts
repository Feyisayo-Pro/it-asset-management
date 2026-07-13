import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StageDto {
  @IsString() @MaxLength(64) state!: string;
  @IsString() @MaxLength(128) label!: string;
  @IsArray() @IsString({ each: true }) requiredRoles!: string[];
  @IsOptional() @IsInt() @Min(1) slaMinutes?: number | null;
  @IsInt() @Min(0) sortOrder!: number;
}

class TransitionDto {
  @IsString() @MaxLength(64) fromState!: string;
  @IsString() @MaxLength(64) toState!: string;
  @IsString() @MaxLength(64) actionName!: string;
  @IsArray() @IsString({ each: true }) requiredRoles!: string[];
  @IsBoolean() requiresSignature!: boolean;
  @IsBoolean() requiresEvidence!: boolean;
  @IsBoolean() requiresComment!: boolean;
  @IsArray() @IsString({ each: true }) notificationRecipients!: string[];
  @IsString() @MaxLength(128) auditAction!: string;
}

export class CreateWorkflowDefinitionDto {
  @IsString() @MaxLength(64) key!: string;
  @IsString() @MaxLength(128) name!: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsString() @MaxLength(64) initialState!: string;
  @IsArray() @IsString({ each: true }) finalStates!: string[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => StageDto)
  stages!: StageDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TransitionDto)
  transitions!: TransitionDto[];
}
