import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(trim)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  designation?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  officeLocation?: string;

  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
