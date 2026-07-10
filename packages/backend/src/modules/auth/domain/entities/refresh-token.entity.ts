export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

export class RefreshToken {
  private constructor(private props: RefreshTokenProps) {}

  static hydrate(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  static issue(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ttlSeconds: number;
    now: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.now.getTime() + input.ttlSeconds * 1_000),
      createdAt: input.now,
      revokedAt: null,
      replacedById: null,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
  get replacedById(): string | null {
    return this.props.replacedById;
  }

  isUsableAt(now: Date): boolean {
    return this.props.revokedAt === null && this.props.expiresAt > now;
  }

  revoke(now: Date, replacedById: string | null = null): void {
    if (this.props.revokedAt !== null) return;
    this.props.revokedAt = now;
    this.props.replacedById = replacedById;
  }

  toPersistence(): RefreshTokenProps {
    return { ...this.props };
  }
}
