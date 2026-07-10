import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/typeorm-entities/user.orm-entity';
import { RefreshTokenOrmEntity } from './infrastructure/typeorm-entities/refresh-token.orm-entity';
import { PasswordResetTokenOrmEntity } from './infrastructure/typeorm-entities/password-reset-token.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { TypeOrmRefreshTokenRepository } from './infrastructure/repositories/typeorm-refresh-token.repository';
import { TypeOrmPasswordResetTokenRepository } from './infrastructure/repositories/typeorm-password-reset-token.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './domain/repositories/password-reset-token.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { MAIL_SERVICE } from './application/ports/mail.port';
import { ID_GENERATOR } from './application/ports/id-generator.port';
import { CLOCK } from './application/ports/clock.port';
import { Argon2PasswordHasher } from './infrastructure/services/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { LoggerMailService } from './infrastructure/services/logger-mail.service';
import { UuidIdGenerator } from './infrastructure/services/uuid-id-generator';
import { SystemClock } from './infrastructure/services/system-clock';
import { BootstrapAdminService } from './infrastructure/services/bootstrap-admin.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { AuthController } from './presentation/auth.controller';
import { CommonModule } from '../../common/common.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      RefreshTokenOrmEntity,
      PasswordResetTokenOrmEntity,
    ]),
    JwtModule.register({}),
    CommonModule,
    RbacModule,
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    BootstrapAdminService,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: TypeOrmRefreshTokenRepository },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: TypeOrmPasswordResetTokenRepository,
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: MAIL_SERVICE, useClass: LoggerMailService },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [TOKEN_SERVICE],
})
export class AuthModule {}
