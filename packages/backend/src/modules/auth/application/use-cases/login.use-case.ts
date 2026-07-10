import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { ID_GENERATOR, IdGenerator } from '../ports/id-generator.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { RbacService } from '../../../rbac/application/rbac.service';
import { EventPublisher } from '../../../../common/events/event-publisher';
import {
  UserLoggedInEvent,
  LoginFailedEvent,
  AccountLockedEvent,
} from '../../domain/events/auth.events';
import {
  AccountDisabledError,
  AccountLockedError,
  InvalidCredentialsError,
} from '../../../../common/errors/auth.errors';
import { RootConfig } from '../../../../config/configuration';
import { asyncContext } from '../../../../common/utils/async-context';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    email: string;
    roleName: string;
    mustChangePassword: boolean;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rbac: RbacService,
    private readonly events: EventPublisher,
    private readonly config: ConfigService<RootConfig, true>,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const now = this.clock.now();
    const emailNormalized = command.email.trim().toLowerCase();
    const ctx = asyncContext.get();

    const user = await this.users.findByEmail(emailNormalized);

    if (!user) {
      // Constant-time-ish: still perform a hash comparison against a
      // dummy hash so wall-clock timing doesn't reveal user existence.
      await this.hasher.verify(command.password, DUMMY_HASH).catch(() => false);
      this.events.publish(
        new LoginFailedEvent({
          emailAttempted: emailNormalized,
          reason: 'unknown_user',
          ip: ctx?.ip,
        }),
      );
      throw new InvalidCredentialsError();
    }

    user.clearLockoutIfExpired(now);

    if (user.isLockedAt(now)) {
      this.events.publish(
        new LoginFailedEvent({
          emailAttempted: emailNormalized,
          reason: 'locked',
          ip: ctx?.ip,
        }),
      );
      throw new AccountLockedError(user.lockedUntil as Date);
    }

    if (!user.isActive) {
      this.events.publish(
        new LoginFailedEvent({
          emailAttempted: emailNormalized,
          reason: 'disabled',
          ip: ctx?.ip,
        }),
      );
      throw new AccountDisabledError();
    }

    const passwordMatches = await this.hasher.verify(
      command.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      const policy = this.config.getOrThrow<RootConfig['lockout']>('lockout');
      user.recordFailedLogin(now, policy.maxAttempts, policy.lockoutMinutes);
      await this.users.save(user);
      this.events.publish(
        new LoginFailedEvent({
          emailAttempted: emailNormalized,
          reason: 'bad_password',
          ip: ctx?.ip,
        }),
      );
      if (user.isLockedAt(now)) {
        this.events.publish(
          new AccountLockedEvent({
            userId: user.id,
            email: user.email,
            lockedUntil: user.lockedUntil as Date,
          }),
        );
      }
      throw new InvalidCredentialsError();
    }

    user.recordSuccessfulLogin(now);
    await this.users.save(user);

    const roleName = await this.resolveRoleName(user.roleId);

    const { token: accessToken, expiresInSeconds: accessExp } =
      await this.tokens.signAccessToken({
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName,
      });

    const issued = await this.tokens.issueRefreshToken();
    const refresh = RefreshToken.issue({
      id: this.ids.next(),
      userId: user.id,
      tokenHash: issued.hash,
      ttlSeconds: issued.ttlSeconds,
      now,
    });
    await this.refreshTokens.save(refresh);

    this.events.publish(
      new UserLoggedInEvent({
        userId: user.id,
        email: user.email,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      }),
    );

    return {
      accessToken,
      accessTokenExpiresIn: accessExp,
      refreshToken: issued.raw,
      refreshTokenExpiresIn: issued.ttlSeconds,
      user: {
        id: user.id,
        email: user.email,
        roleName,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private async resolveRoleName(roleId: string): Promise<string> {
    // Roles are seeded and immutable; a per-request cache miss is O(1).
    const roles = await this.rbac.listRoles();
    const found = roles.find((r) => r.id === roleId);
    return found?.name ?? 'UNKNOWN';
  }
}

/**
 * A pre-computed argon2 hash of a fixed random string, used to make
 * the "unknown user" login path do the same amount of CPU work as the
 * "known user, bad password" path. Not a real credential.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZS1zYWx0LWJ5dGVz$Kv5FzKtn6b0kEHnTx3xJ9wUklBmXY9K3qxRfVBt7hZ0';
