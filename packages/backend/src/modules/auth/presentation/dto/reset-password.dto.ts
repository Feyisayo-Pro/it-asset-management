import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(32, 256)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
