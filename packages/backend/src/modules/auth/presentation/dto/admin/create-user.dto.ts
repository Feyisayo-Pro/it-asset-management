import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: string }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminCreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsUUID()
  roleId!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
