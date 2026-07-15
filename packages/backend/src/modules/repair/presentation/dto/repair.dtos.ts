import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ALL_REPAIR_STATUSES,
  RepairStatus,
} from '../../domain/value-objects/repair-enums';

export class OpenRepairDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  @MaxLength(4000)
  reportedFault!: string;

  @IsOptional() @IsUUID() employeeUserId?: string;
  @IsOptional() @IsUUID() technicianUserId?: string;
  @IsOptional() @IsString() @MaxLength(255) vendor?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @IsString() @MaxLength(3) costCurrency?: string;
}

export class UpdateRepairDto {
  @IsOptional() @IsUUID() technicianUserId?: string | null;
  @IsOptional() @IsString() @MaxLength(255) vendor?: string | null;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number | null;
}

export class TransitionRepairDto {
  @IsEnum(ALL_REPAIR_STATUSES)
  toStatus!: RepairStatus;

  @IsOptional() @IsString() @MaxLength(4000) diagnosis?: string;
  @IsOptional() @IsString() @MaxLength(4000) resolutionNotes?: string;
  @IsOptional() @IsNumber() @Min(0) actualCost?: number;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class ListRepairsQuery {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) @IsOptional() pageSize: number = 20;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsEnum(ALL_REPAIR_STATUSES) status?: RepairStatus;
  @IsOptional() @IsUUID() technicianUserId?: string;
}
