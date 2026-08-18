import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkImportDto {
  @ApiProperty({
    description: 'Raw CSV text. Required columns: device_type, brand, model, serial_number.',
    maxLength: 5_000_000,
  })
  @IsString()
  @MaxLength(5_000_000, { message: 'CSV too large (max 5MB)' })
  csv!: string;

  @ApiPropertyOptional({
    description: 'When true, validates and reports per-row results without writing anything.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
