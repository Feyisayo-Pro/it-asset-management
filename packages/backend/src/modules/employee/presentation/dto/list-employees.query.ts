import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EmploymentStatus } from '../../domain/value-objects/employment-status';
import { EmployeeSortField } from '../../domain/repositories/employee.repository';

export class ListEmployeesQuery {
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  officeLocation?: string;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @IsOptional()
  @IsString()
  sortField?: EmployeeSortField;

  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';
}
