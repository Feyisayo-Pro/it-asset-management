export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roleId: string;
  roleName: string;
  iat: number;
  exp: number;
}

export interface AccessTokenSubject {
  sub: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface RefreshTokenIssued {
  raw: string;
  hash: string;
  ttlSeconds: number;
}

export interface TokenService {
  signAccessToken(subject: AccessTokenSubject): Promise<{
    token: string;
    expiresInSeconds: number;
  }>;

  verifyAccessToken(token: string): Promise<AccessTokenClaims>;

  /**
   * Generates a fresh opaque refresh token (high-entropy random) and
   * returns both the raw form (given to client) and the hash (stored).
   */
  issueRefreshToken(): Promise<RefreshTokenIssued>;

  hashRefreshToken(raw: string): string;
  hashResetToken(raw: string): string;
  issueResetToken(): { raw: string; hash: string };
}
