import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { MAIL_SERVICE, MailService } from '../ports/mail.port';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  PasswordChangedEvent,
  PasswordResetCompletedEvent,
} from '../../domain/events/auth.events';
import {
  InvalidPasswordResetTokenError,
  AccountDisabledError,
} from '../../../../common/errors/auth.errors';
import { PasswordPolicy } from '../../domain/services/password-policy';

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    PasswordPolicy.assertValid(command.newPassword);

    const now = this.clock.now();
    const hash = this.tokens.hashResetToken(command.token);
    const token = await this.resetTokens.findByHash(hash);
    if (!token || !token.isUsableAt(now)) {
      throw new InvalidPasswordResetTokenError();
    }

    const user = await this.users.findById(token.userId);
    if (!user || !user.isActive) {
      throw new AccountDisabledError();
    }

    const newHash = await this.hasher.hash(command.newPassword);
    user.changePassword(newHash, now);
    await this.users.save(user);

    token.markUsed(now);
    await this.resetTokens.save(token);

    // Every existing session is invalidated on password reset.
    await this.refreshTokens.revokeAllForUser(user.id, now);

    await this.mail.sendPasswordChangedConfirmation({
      to: user.email,
      userId: user.id,
      changedAt: now,
    });

    this.events.publish(
      new PasswordChangedEvent({ userId: user.id, email: user.email }),
    );
    this.events.publish(
      new PasswordResetCompletedEvent({
        userId: user.id,
        email: user.email,
      }),
    );
  }
}
