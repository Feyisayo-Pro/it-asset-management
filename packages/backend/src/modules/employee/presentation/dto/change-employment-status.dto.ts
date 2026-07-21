import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EmploymentStatus } from '../../domain/value-objects/employment-status';

export class ChangeEmploymentStatusDto {
  @IsEnum(EmploymentStatus)
  status!: EmploymentStatus;

  @IsOptional()
  @IsDateString()
  terminationDate?: string | null;
}
