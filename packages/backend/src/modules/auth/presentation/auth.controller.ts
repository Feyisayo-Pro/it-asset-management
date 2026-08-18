import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { ThrottleAuth } from '../../../common/decorators/throttle-auth.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  LoginResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @Public()
  @ThrottleAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<RefreshResponseDto> {
    return this.refreshTokenUseCase.execute({ refreshToken: dto.refreshToken });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      userId: user.id,
      refreshToken: dto.refreshToken,
      allDevices: dto.allDevices,
    });
  }

  @Public()
  @ThrottleAuth()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ status: 'accepted' }> {
    await this.forgotPasswordUseCase.execute({ email: dto.email });
    return { status: 'accepted' };
  }

  @Public()
  @ThrottleAuth()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.changePasswordUseCase.execute({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Get('me')
  me(
    @CurrentUser() user: AuthenticatedUser,
  ): AuthenticatedUser {
    return user;
  }
}
