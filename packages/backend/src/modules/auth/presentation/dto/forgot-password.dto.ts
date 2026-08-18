import { IsEmail, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
