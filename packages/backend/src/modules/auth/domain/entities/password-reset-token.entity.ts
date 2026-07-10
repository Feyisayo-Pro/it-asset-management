export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

export class PasswordResetToken {
  private constructor(private props: PasswordResetTokenProps) {}

  static hydrate(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken(props);
  }

  static issue(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ttlMinutes: number;
    now: Date;
  }): PasswordResetToken {
    return new PasswordResetToken({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.now.getTime() + input.ttlMinutes * 60 * 1_000),
      createdAt: input.now,
      usedAt: null,
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
  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  isUsableAt(now: Date): boolean {
    return this.props.usedAt === null && this.props.expiresAt > now;
  }

  markUsed(now: Date): void {
    if (this.props.usedAt !== null) return;
    this.props.usedAt = now;
  }

  toPersistence(): PasswordResetTokenProps {
    return { ...this.props };
  }
}
