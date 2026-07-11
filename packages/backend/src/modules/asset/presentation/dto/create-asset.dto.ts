import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(trim)
  assetTag?: string;

  @IsString()
  @MaxLength(64)
  @Transform(trim)
  deviceType!: string;

  @IsString()
  @MaxLength(128)
  @Transform(trim)
  brand!: string;

  @IsString()
  @MaxLength(128)
  @Transform(trim)
  model!: string;

  @IsString()
  @MaxLength(128)
  @Transform(trim)
  serialNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  imei?: string | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseAmount?: number | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  purchaseCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string | null;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  officeLocation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  department?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  markAvailableImmediately?: boolean;
}
