import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { ID_GENERATOR, IdGenerator } from '../ports/id-generator.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { MAIL_SERVICE, MailService } from '../ports/mail.port';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { PasswordResetRequestedEvent } from '../../domain/events/auth.events';
import { RootConfig } from '../../../../config/configuration';

export interface ForgotPasswordCommand {
  email: string;
}

/**
 * ForgotPasswordUseCase — deliberately does not reveal whether the
 * email exists. Result is always the same public shape. When the user
 * exists we mint a reset token, invalidate prior tokens for that user,
 * and dispatch the email.
 */
@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly events: EventPublisher,
    private readonly config: ConfigService<RootConfig, true>,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const emailNormalized = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(emailNormalized);
    if (!user || !user.isActive) return;

    const now = this.clock.now();
    const policy =
      this.config.getOrThrow<RootConfig['passwordReset']>('passwordReset');

    await this.resetTokens.invalidateAllForUser(user.id, now);

    const { raw, hash } = this.tokens.issueResetToken();
    const token = PasswordResetToken.issue({
      id: this.ids.next(),
      userId: user.id,
      tokenHash: hash,
      ttlMinutes: policy.ttlMinutes,
      now,
    });
    await this.resetTokens.save(token);

    const resetUrl = `${policy.urlBase}?token=${encodeURIComponent(raw)}`;
    await this.mail.sendPasswordReset({
      to: user.email,
      userId: user.id,
      resetUrl,
      expiresAt: token.expiresAt,
    });

    this.events.publish(
      new PasswordResetRequestedEvent({
        userId: user.id,
        email: user.email,
        rawToken: raw,
        expiresAt: token.expiresAt,
      }),
    );
  }
}
