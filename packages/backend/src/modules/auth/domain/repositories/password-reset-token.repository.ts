import { PasswordResetToken } from '../entities/password-reset-token.entity';

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol(
  'PASSWORD_RESET_TOKEN_REPOSITORY',
);

export interface PasswordResetTokenRepository {
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  save(token: PasswordResetToken): Promise<PasswordResetToken>;
  invalidateAllForUser(userId: string, now: Date): Promise<void>;
  deleteExpiredBefore(threshold: Date): Promise<number>;
}
