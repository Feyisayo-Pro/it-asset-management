import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TransitionDto {
  @IsString()
  @MaxLength(64)
  actionName!: string;

  @IsOptional() @IsString() @MaxLength(255) signatureName?: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) evidenceFileIds?: string[];
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class BypassDto {
  @IsString() @MaxLength(64) toState!: string;
  @IsString() @MaxLength(2000) reason!: string;
}

export class CreateInstanceDto {
  @IsString() @MaxLength(64) definitionKey!: string;
  @IsString() @MaxLength(64) subjectType!: string;
  @IsString() @MaxLength(64) subjectId!: string;
}
