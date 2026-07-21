import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAllocationDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  justification?: string | null;
}

export class AssignAssetDto {
  @IsUUID()
  assetId!: string;
}

export class TransitionAllocationDto {
  @IsString()
  actionName!: string;

  @IsOptional()
  @IsString()
  signatureName?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ListAllocationsQuery {
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
  @IsString()
  status?: string;
}
