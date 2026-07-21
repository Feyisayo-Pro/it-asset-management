import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(50)
  @Transform(trim)
  employeeCode!: string;

  @IsString()
  @MaxLength(100)
  @Transform(trim)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  @Transform(trim)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  @Transform(trim)
  email!: string;

  @IsString()
  @MaxLength(128)
  @Transform(trim)
  department!: string;

  @IsString()
  @MaxLength(100)
  @Transform(trim)
  designation!: string;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @IsString()
  @MaxLength(128)
  @Transform(trim)
  officeLocation!: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
