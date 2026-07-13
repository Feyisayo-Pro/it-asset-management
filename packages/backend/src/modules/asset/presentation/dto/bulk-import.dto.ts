import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BulkImportDto {
  @IsString()
  @MaxLength(5_000_000, { message: 'CSV too large (max 5MB)' })
  csv!: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
