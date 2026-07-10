import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import {
  AccessTokenClaims,
  AccessTokenSubject,
  RefreshTokenIssued,
  TokenService,
} from '../../application/ports/token-service.port';
import { RootConfig } from '../../../../config/configuration';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<RootConfig, true>,
  ) {}

  async signAccessToken(subject: AccessTokenSubject): Promise<{
    token: string;
    expiresInSeconds: number;
  }> {
    const jwtCfg = this.config.getOrThrow<RootConfig['jwt']>('jwt');
    const token = await this.jwt.signAsync(
      {
        sub: subject.sub,
        email: subject.email,
        roleId: subject.roleId,
        roleName: subject.roleName,
      },
      {
        secret: jwtCfg.accessSecret,
        expiresIn: jwtCfg.accessTtlSeconds,
        issuer: jwtCfg.issuer,
        audience: jwtCfg.audience,
      },
    );
    return { token, expiresInSeconds: jwtCfg.accessTtlSeconds };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const jwtCfg = this.config.getOrThrow<RootConfig['jwt']>('jwt');
    const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
      secret: jwtCfg.accessSecret,
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
    });
    return claims;
  }

  async issueRefreshToken(): Promise<RefreshTokenIssued> {
    const jwtCfg = this.config.getOrThrow<RootConfig['jwt']>('jwt');
    const raw = randomBytes(32).toString('hex');
    return {
      raw,
      hash: this.hashRefreshToken(raw),
      ttlSeconds: jwtCfg.refreshTtlSeconds,
    };
  }

  hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  hashResetToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  issueResetToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    return { raw, hash: this.hashResetToken(raw) };
  }
}
