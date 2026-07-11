import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAssetDto {
  @IsOptional() @IsString() @MaxLength(64) deviceType?: string;
  @IsOptional() @IsString() @MaxLength(128) brand?: string;
  @IsOptional() @IsString() @MaxLength(128) model?: string;
  @IsOptional() @IsString() @MaxLength(32) imei?: string | null;
  @IsOptional() @IsDateString() purchaseDate?: string | null;
  @IsOptional() @IsNumber() @Min(0) purchaseAmount?: number | null;
  @IsOptional() @IsString() @Length(3, 3) purchaseCurrency?: string;
  @IsOptional() @IsString() @MaxLength(255) vendor?: string | null;
  @IsOptional() @IsDateString() warrantyExpiry?: string | null;
  @IsOptional() @IsString() @MaxLength(128) officeLocation?: string | null;
  @IsOptional() @IsString() @MaxLength(128) department?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}
