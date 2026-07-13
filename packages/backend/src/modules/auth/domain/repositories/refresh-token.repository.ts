import { RefreshToken } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<RefreshToken>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
  deleteExpiredBefore(threshold: Date): Promise<number>;
}
