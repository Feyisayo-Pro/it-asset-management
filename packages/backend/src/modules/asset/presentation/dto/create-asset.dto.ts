import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetTagGenerator } from '../../domain/services/asset-tag-generator';
import { IsOnOrAfterField } from '../../../../common/validators/is-on-or-after-field.validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAssetDto {
  @ApiPropertyOptional({
    description:
      'Asset tag in AST-{YYYY}-{SEQ} format. Omit to have the server generate one.',
    example: 'AST-2026-00042',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(trim)
  @ValidateIf((o: CreateAssetDto) => !!o.assetTag)
  @Matches(AssetTagGenerator.PATTERN, {
    message: 'assetTag must match the format AST-{YYYY}-{SEQ} (e.g. AST-2026-00042)',
  })
  assetTag?: string;

  @ApiProperty({ example: 'Laptop', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Transform(trim)
  deviceType!: string;

  @ApiProperty({ example: 'Dell', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  brand!: string;

  @ApiProperty({ example: 'Latitude 5440', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  model!: string;

  @ApiProperty({ example: 'SN-8842091', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  serialNumber!: string;

  @ApiPropertyOptional({ example: '351756051523999', maxLength: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  imei?: string | null;

  @ApiPropertyOptional({
    description: 'ISO 8601 date',
    example: '2026-01-15',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @ApiPropertyOptional({ example: 1200.0, minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseAmount?: number | null;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code', example: 'USD', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  purchaseCurrency?: string;

  @ApiPropertyOptional({ example: 'Acme Direct', maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string | null;

  @ApiPropertyOptional({
    description: 'ISO 8601 date. Must not precede purchaseDate when both are supplied.',
    example: '2028-01-15',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  @IsOnOrAfterField('purchaseDate', {
    message: 'warrantyExpiry cannot precede purchaseDate',
  })
  warrantyExpiry?: string | null;

  @ApiPropertyOptional({ example: 'HQ - Lagos', maxLength: 128, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  officeLocation?: string | null;

  @ApiPropertyOptional({ example: 'Engineering', maxLength: 128, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  department?: string | null;

  @ApiPropertyOptional({
    description: 'Display-only employee name this device is assigned to — not a system user account.',
    example: 'Ogunsola Gabriel',
    maxLength: 128,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignedEmployeeName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'If true, transitions the asset straight to Available after registration.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  markAvailableImmediately?: boolean;
}
