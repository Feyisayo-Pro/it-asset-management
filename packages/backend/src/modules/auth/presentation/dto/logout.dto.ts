import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @Length(16, 256)
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}
