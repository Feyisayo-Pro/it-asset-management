import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { UserLoggedOutEvent } from '../../domain/events/auth.events';

export interface LogoutCommand {
  userId: string;
  refreshToken?: string;
  /**
   * When true, revoke every refresh token for the user
   * ("log out of all devices"). Otherwise only the presented token
   * is revoked.
   */
  allDevices?: boolean;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const now = this.clock.now();

    if (command.allDevices) {
      await this.refreshTokens.revokeAllForUser(command.userId, now);
    } else if (command.refreshToken) {
      const hash = this.tokens.hashRefreshToken(command.refreshToken);
      const existing = await this.refreshTokens.findByHash(hash);
      if (existing && existing.userId === command.userId) {
        existing.revoke(now);
        await this.refreshTokens.save(existing);
      }
    }

    this.events.publish(new UserLoggedOutEvent({ userId: command.userId }));
  }
}
