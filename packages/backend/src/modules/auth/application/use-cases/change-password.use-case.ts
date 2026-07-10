import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { MAIL_SERVICE, MailService } from '../ports/mail.port';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { PasswordChangedEvent } from '../../domain/events/auth.events';
import {
  AccountDisabledError,
  InvalidCredentialsError,
  SamePasswordError,
} from '../../../../common/errors/auth.errors';
import { PasswordPolicy } from '../../domain/services/password-policy';

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    if (command.currentPassword === command.newPassword) {
      throw new SamePasswordError();
    }
    PasswordPolicy.assertValid(command.newPassword);

    const user = await this.users.findById(command.userId);
    if (!user || !user.isActive) throw new AccountDisabledError();

    const ok = await this.hasher.verify(
      command.currentPassword,
      user.passwordHash,
    );
    if (!ok) throw new InvalidCredentialsError();

    const now = this.clock.now();
    const newHash = await this.hasher.hash(command.newPassword);
    user.changePassword(newHash, now);
    await this.users.save(user);

    await this.refreshTokens.revokeAllForUser(user.id, now);

    await this.mail.sendPasswordChangedConfirmation({
      to: user.email,
      userId: user.id,
      changedAt: now,
    });
    this.events.publish(
      new PasswordChangedEvent({ userId: user.id, email: user.email }),
    );
  }
}
