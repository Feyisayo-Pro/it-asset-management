import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserSortField } from '../../../domain/repositories/user.repository';

const asBool = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class ListUsersQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @Transform(asBool)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['lastName', 'email', 'lastLoginAt', 'createdAt'])
  sortField?: UserSortField;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
