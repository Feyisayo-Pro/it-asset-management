import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ALL_DISPOSAL_METHODS,
  ALL_DISPOSAL_REASONS,
  ALL_DISPOSAL_STATUSES,
  DisposalMethod,
  DisposalReason,
  DisposalStatus,
} from '../../domain/value-objects/disposal-enums';

export class RequestDisposalDto {
  @IsUUID()
  assetId!: string;

  @IsEnum(ALL_DISPOSAL_REASONS)
  reason!: DisposalReason;

  @IsEnum(ALL_DISPOSAL_METHODS)
  method!: DisposalMethod;

  @IsOptional() @IsString() @MaxLength(4000) requestNotes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_tld: false, require_protocol: true }, { each: true })
  evidenceUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_tld: false, require_protocol: true }, { each: true })
  photoUrls?: string[];
}

export class ApproveDisposalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  signaturePrintedName!: string;

  @IsDateString()
  disposalDate!: string;

  @IsOptional() @IsUUID() witnessUserId?: string;
  @IsOptional() @IsString() @MaxLength(4000) approvalNotes?: string;
}

export class RejectDisposalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  rejectionReason!: string;
}

export class ListDisposalsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) @IsOptional() pageSize: number = 20;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsEnum(ALL_DISPOSAL_STATUSES) status?: DisposalStatus;
  @IsOptional() @IsUUID() requestedByUserId?: string;
  @IsOptional() @IsUUID() approvedByUserId?: string;
}
