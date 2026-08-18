import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOnOrAfterField } from '../../../../common/validators/is-on-or-after-field.validator';

/**
 * All fields are optional (partial update); assetTag and serialNumber
 * are intentionally not editable here — see CLAUDE.md.
 */
export class UpdateAssetDto {
  @ApiPropertyOptional({ example: 'Laptop', maxLength: 64 })
  @IsOptional() @IsString() @MaxLength(64) deviceType?: string;

  @ApiPropertyOptional({ example: 'Dell', maxLength: 128 })
  @IsOptional() @IsString() @MaxLength(128) brand?: string;

  @ApiPropertyOptional({ example: 'Latitude 5440', maxLength: 128 })
  @IsOptional() @IsString() @MaxLength(128) model?: string;

  @ApiPropertyOptional({ example: '351756051523999', maxLength: 32, nullable: true })
  @IsOptional() @IsString() @MaxLength(32) imei?: string | null;

  @ApiPropertyOptional({ description: 'ISO 8601 date', example: '2026-01-15', nullable: true })
  @IsOptional() @IsDateString() purchaseDate?: string | null;

  @ApiPropertyOptional({ example: 1200.0, minimum: 0, nullable: true })
  @IsOptional() @IsNumber() @Min(0) purchaseAmount?: number | null;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code', example: 'USD', minLength: 3, maxLength: 3 })
  @IsOptional() @IsString() @Length(3, 3) purchaseCurrency?: string;

  @ApiPropertyOptional({ example: 'Acme Direct', maxLength: 255, nullable: true })
  @IsOptional() @IsString() @MaxLength(255) vendor?: string | null;

  @ApiPropertyOptional({
    description:
      'ISO 8601 date. Only checked against purchaseDate here when both are supplied in the same request — a patch touching only warrantyExpiry is validated against the persisted purchaseDate server-side.',
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
  @IsOptional() @IsString() @MaxLength(128) officeLocation?: string | null;

  @ApiPropertyOptional({ example: 'Engineering', maxLength: 128, nullable: true })
  @IsOptional() @IsString() @MaxLength(128) department?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() notes?: string | null;
}
