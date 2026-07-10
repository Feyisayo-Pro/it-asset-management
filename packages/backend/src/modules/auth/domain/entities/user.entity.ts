/**
 * User aggregate root. Owns credential state and lockout state.
 * Business rules that mutate this state (successful login, failed
 * login, lockout, password change) are methods on this class so
 * repositories never encode business logic.
 */
export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  roleId: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static hydrate(props: UserProps): User {
    return new User(props);
  }

  static create(input: {
    id: string;
    email: string;
    passwordHash: string;
    roleId: string;
    mustChangePassword?: boolean;
  }): User {
    const now = new Date();
    return new User({
      id: input.id,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      roleId: input.roleId,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      mustChangePassword: input.mustChangePassword ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get roleId(): string {
    return this.props.roleId;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }
  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }
  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }
  get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isLockedAt(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  recordSuccessfulLogin(now: Date): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  recordFailedLogin(now: Date, maxAttempts: number, lockoutMinutes: number): void {
    this.props.failedLoginAttempts += 1;
    this.props.updatedAt = now;
    if (this.props.failedLoginAttempts >= maxAttempts) {
      this.props.lockedUntil = new Date(
        now.getTime() + lockoutMinutes * 60 * 1_000,
      );
    }
  }

  clearLockoutIfExpired(now: Date): void {
    if (this.props.lockedUntil !== null && this.props.lockedUntil <= now) {
      this.props.lockedUntil = null;
      this.props.failedLoginAttempts = 0;
      this.props.updatedAt = now;
    }
  }

  changePassword(newHash: string, now: Date): void {
    this.props.passwordHash = newHash;
    this.props.mustChangePassword = false;
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.updatedAt = now;
  }

  deactivate(now: Date): void {
    this.props.isActive = false;
    this.props.updatedAt = now;
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }
}
