import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateVendorDto {
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  contactPerson?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(trim)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trim)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trim)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  website?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trim)
  notes?: string | null;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  contactPerson?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(trim)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trim)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trim)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  website?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trim)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListVendorsQuery {
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
}
