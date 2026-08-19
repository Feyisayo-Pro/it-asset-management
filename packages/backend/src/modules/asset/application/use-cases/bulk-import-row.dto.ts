import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetTagGenerator } from '../../domain/services/asset-tag-generator';
import { IsOnOrAfterField } from '../../../../common/validators/is-on-or-after-field.validator';

/**
 * Schema for a single row of an imported CSV — every manual/imported
 * value is run through this the same way CreateAssetDto validates a
 * single-asset creation request, so bulk import can't bypass rules
 * that apply to the regular create path.
 *
 * This is an internal application-layer validation schema, not an
 * HTTP DTO — it's never bound to a controller method (the raw CSV
 * text is the actual request body, see BulkImportDto), so it will not
 * appear in the generated Swagger document on its own. The
 * @ApiProperty decorators here document the per-row contract for
 * anyone reading the source; they don't render in /api/docs unless
 * explicitly registered via @ApiExtraModels.
 */
export class BulkImportRowDto {
  @ApiPropertyOptional({
    description: 'CSV column: asset_tag. Must match AST-{YYYY}-{SEQ} if supplied.',
    example: 'AST-2026-00042',
  })
  @IsOptional()
  @Matches(AssetTagGenerator.PATTERN, {
    message: 'assetTag must match the format AST-{YYYY}-{SEQ} (e.g. AST-2026-00042)',
  })
  assetTag?: string;

  @ApiProperty({ description: 'CSV column: device_type', example: 'Laptop', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deviceType!: string;

  @ApiProperty({ description: 'CSV column: brand', example: 'Dell', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  brand!: string;

  @ApiProperty({ description: 'CSV column: model', example: 'Latitude 5440', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  model!: string;

  @ApiProperty({ description: 'CSV column: serial_number', example: 'SN-8842091', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  serialNumber!: string;

  @ApiPropertyOptional({ description: 'CSV column: imei', example: '351756051523999', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  imei?: string;

  @ApiPropertyOptional({ description: 'CSV column: purchase_date (ISO 8601)', example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'CSV column: purchase_amount', example: 1200.0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseAmount?: number;

  @ApiPropertyOptional({
    description: 'CSV column: purchase_currency (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  purchaseCurrency?: string;

  @ApiPropertyOptional({ description: 'CSV column: vendor', example: 'Acme Direct', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @ApiPropertyOptional({
    description:
      'CSV column: warranty_expiry (ISO 8601). Must not precede purchase_date when both are present in the row.',
    example: '2028-01-15',
  })
  @IsOptional()
  @IsDateString()
  @IsOnOrAfterField('purchaseDate', {
    message: 'warrantyExpiry cannot precede purchaseDate',
  })
  warrantyExpiry?: string;

  @ApiPropertyOptional({ description: 'CSV column: office_location', example: 'HQ - Lagos', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  officeLocation?: string;

  @ApiPropertyOptional({ description: 'CSV column: department', example: 'Engineering', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  department?: string;

  @ApiPropertyOptional({
    description: 'CSV column: assigned_employee_name — display-only, not a system user account.',
    example: 'Ogunsola Gabriel',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignedEmployeeName?: string;

  @ApiPropertyOptional({ description: 'CSV column: notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
