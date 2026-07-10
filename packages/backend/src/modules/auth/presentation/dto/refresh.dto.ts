import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @IsString()
  @Length(16, 256)
  refreshToken!: string;
}
