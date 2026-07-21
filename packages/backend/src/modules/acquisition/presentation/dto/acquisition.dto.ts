import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAcquisitionDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  invoiceNumber?: string | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity?: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assetIds?: string[];
}

export class UpdateAcquisitionDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  invoiceNumber?: string | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity?: number;

  @IsOptional()
  @IsString()
  @Transform(trim)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assetIds?: string[];
}

export class ListAcquisitionsQuery {
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  @Transform(trim)
  search?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;
}
