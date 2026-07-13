import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { ID_GENERATOR, IdGenerator } from '../ports/id-generator.port';
import { CLOCK, Clock } from '../ports/clock.port';
import { RbacService } from '../../../rbac/application/rbac.service';
import {
  AccountDisabledError,
  InvalidRefreshTokenError,
} from '../../../../common/errors/auth.errors';

export interface RefreshCommand {
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rbac: RbacService,
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const now = this.clock.now();
    const hash = this.tokens.hashRefreshToken(command.refreshToken);
    const existing = await this.refreshTokens.findByHash(hash);
    if (!existing || !existing.isUsableAt(now)) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(existing.userId);
    if (!user || !user.isActive) {
      throw new AccountDisabledError();
    }

    // Rotate: issue new, revoke old with replaced_by pointer for audit.
    const issued = await this.tokens.issueRefreshToken();
    const rotated = RefreshToken.issue({
      id: this.ids.next(),
      userId: existing.userId,
      tokenHash: issued.hash,
      ttlSeconds: issued.ttlSeconds,
      now,
    });
    existing.revoke(now, rotated.id);
    await this.refreshTokens.save(existing);
    await this.refreshTokens.save(rotated);

    const roleName = await this.resolveRoleName(user.roleId);
    const { token: accessToken, expiresInSeconds: accessExp } =
      await this.tokens.signAccessToken({
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName,
      });

    return {
      accessToken,
      accessTokenExpiresIn: accessExp,
      refreshToken: issued.raw,
      refreshTokenExpiresIn: issued.ttlSeconds,
    };
  }

  private async resolveRoleName(roleId: string): Promise<string> {
    const roles = await this.rbac.listRoles();
    const found = roles.find((r) => r.id === roleId);
    return found?.name ?? 'UNKNOWN';
  }
}
