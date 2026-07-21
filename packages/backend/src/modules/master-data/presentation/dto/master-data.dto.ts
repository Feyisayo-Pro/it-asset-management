import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMasterDataDto {
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  name!: string;
}

export class UpdateMasterDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
