/**
 * Test fakes — in-memory implementations of every domain repository
 * and application port used across auth unit tests. Deterministic
 * clock + id generator; the fake hasher and token service produce
 * predictable outputs so assertions don't depend on random state.
 */
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  ListUsersParams,
  ListUsersResult,
  UserRepository,
} from '../../../src/modules/auth/domain/repositories/user.repository';
import {
  RefreshToken,
} from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../../src/modules/auth/domain/repositories/refresh-token.repository';
import {
  PasswordResetToken,
} from '../../../src/modules/auth/domain/entities/password-reset-token.entity';
import { PasswordResetTokenRepository } from '../../../src/modules/auth/domain/repositories/password-reset-token.repository';
import { PasswordHasher } from '../../../src/modules/auth/application/ports/password-hasher.port';
import {
  AccessTokenClaims,
  AccessTokenSubject,
  RefreshTokenIssued,
  TokenService,
} from '../../../src/modules/auth/application/ports/token-service.port';
import { IdGenerator } from '../../../src/modules/auth/application/ports/id-generator.port';
import { Clock } from '../../../src/modules/auth/application/ports/clock.port';
import { MailService } from '../../../src/modules/auth/application/ports/mail.port';

export class FakeUserRepository implements UserRepository {
  private byId = new Map<string, User>();

  add(user: User): void {
    this.byId.set(user.id, user);
  }
  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    for (const u of this.byId.values()) {
      if (u.email === normalized) return u;
    }
    return null;
  }
  async countAll(): Promise<number> {
    return this.byId.size;
  }
  async countActiveByRole(roleId: string): Promise<number> {
    let n = 0;
    for (const u of this.byId.values()) {
      if (u.roleId === roleId && u.isActive) n += 1;
    }
    return n;
  }
  async list(params: ListUsersParams): Promise<ListUsersResult> {
    let items = Array.from(this.byId.values());
    if (params.search) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (u) =>
          u.email.includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q),
      );
    }
    if (params.roleId) items = items.filter((u) => u.roleId === params.roleId);
    if (params.isActive !== undefined) {
      items = items.filter((u) => u.isActive === params.isActive);
    }

    const field = params.sort?.field ?? 'lastName';
    const dir = params.sort?.direction === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[field] ?? '';
      const bv = (b as unknown as Record<string, unknown>)[field] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      data: items.slice(start, start + pageSize),
      page,
      pageSize,
      total,
    };
  }
  async save(user: User): Promise<User> {
    this.byId.set(user.id, user);
    return user;
  }
}

export class FakeRefreshTokenRepository implements RefreshTokenRepository {
  private byId = new Map<string, RefreshToken>();

  async findByHash(hash: string): Promise<RefreshToken | null> {
    for (const t of this.byId.values()) {
      if (t.tokenHash === hash) return t;
    }
    return null;
  }
  async save(token: RefreshToken): Promise<RefreshToken> {
    this.byId.set(token.id, token);
    return token;
  }
  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const t of this.byId.values()) {
      if (t.userId === userId && t.revokedAt === null) {
        t.revoke(now);
      }
    }
  }
  async deleteExpiredBefore(threshold: Date): Promise<number> {
    let count = 0;
    for (const [id, t] of this.byId) {
      if (t.expiresAt < threshold) {
        this.byId.delete(id);
        count += 1;
      }
    }
    return count;
  }
  all(): RefreshToken[] {
    return Array.from(this.byId.values());
  }
}

export class FakePasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  private byId = new Map<string, PasswordResetToken>();

  async findByHash(hash: string): Promise<PasswordResetToken | null> {
    for (const t of this.byId.values()) if (t.tokenHash === hash) return t;
    return null;
  }
  async save(token: PasswordResetToken): Promise<PasswordResetToken> {
    this.byId.set(token.id, token);
    return token;
  }
  async invalidateAllForUser(userId: string, now: Date): Promise<void> {
    for (const t of this.byId.values()) {
      if (t.userId === userId && t.usedAt === null) t.markUsed(now);
    }
  }
  async deleteExpiredBefore(threshold: Date): Promise<number> {
    let n = 0;
    for (const [id, t] of this.byId) {
      if (t.expiresAt < threshold) {
        this.byId.delete(id);
        n += 1;
      }
    }
    return n;
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash(${plain})`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hash(${plain})`;
  }
}

export class FakeTokenService implements TokenService {
  public accessTokenSeq = 0;
  public refreshTokenSeq = 0;
  public resetTokenSeq = 0;

  async signAccessToken(subject: AccessTokenSubject): Promise<{
    token: string;
    expiresInSeconds: number;
  }> {
    this.accessTokenSeq += 1;
    return {
      token: `access-${this.accessTokenSeq}-${subject.sub}`,
      expiresInSeconds: 900,
    };
  }
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const parts = token.split('-');
    if (parts[0] !== 'access') throw new Error('invalid');
    return {
      sub: parts.slice(2).join('-'),
      email: 'x@x',
      roleId: 'r',
      roleName: 'EMPLOYEE',
      iat: 0,
      exp: 1,
    };
  }
  async issueRefreshToken(): Promise<RefreshTokenIssued> {
    this.refreshTokenSeq += 1;
    const raw = `raw-refresh-${this.refreshTokenSeq}`;
    return {
      raw,
      hash: this.hashRefreshToken(raw),
      ttlSeconds: 60 * 60 * 24 * 14,
    };
  }
  hashRefreshToken(raw: string): string {
    return `hash:refresh:${raw}`;
  }
  hashResetToken(raw: string): string {
    return `hash:reset:${raw}`;
  }
  issueResetToken(): { raw: string; hash: string } {
    this.resetTokenSeq += 1;
    const raw = `raw-reset-${this.resetTokenSeq}`;
    return { raw, hash: this.hashResetToken(raw) };
  }
}

export class FakeIdGenerator implements IdGenerator {
  private seq = 0;
  next(): string {
    this.seq += 1;
    return `id-${this.seq}`;
  }
}

export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(next: Date): void {
    this.current = next;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeMailService implements MailService {
  resetCalls: Array<{
    to: string;
    userId: string;
    resetUrl: string;
    expiresAt: Date;
  }> = [];
  changedCalls: Array<{ to: string; userId: string; changedAt: Date }> = [];

  async sendPasswordReset(input: {
    to: string;
    userId: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    this.resetCalls.push(input);
  }
  async sendPasswordChangedConfirmation(input: {
    to: string;
    userId: string;
    changedAt: Date;
  }): Promise<void> {
    this.changedCalls.push(input);
  }
}

// Minimal config-service stub matching the surface use cases call.
export class FakeConfigService {
  private map: Record<string, unknown>;
  constructor(overrides: Record<string, unknown> = {}) {
    this.map = {
      lockout: { maxAttempts: 3, lockoutMinutes: 15 },
      passwordReset: {
        ttlMinutes: 30,
        urlBase: 'https://iam.example/reset-password',
      },
      ...overrides,
    };
  }
  getOrThrow<T>(key: string): T {
    const value = this.map[key];
    if (value === undefined) throw new Error(`missing config: ${key}`);
    return value as T;
  }
}

// Rbac service stub used by login/refresh (returns permissions + roles).
export class FakeRbacService {
  constructor(
    public readonly roles: Array<{
      id: string;
      name: string;
      description: string;
    }>,
    public readonly permsByRoleId: Record<string, string[]> = {},
  ) {}
  async getPermissionsForRole(roleId: string): Promise<string[]> {
    return this.permsByRoleId[roleId] ?? [];
  }
  async listRoles(): Promise<Array<{ id: string; name: string; description: string }>> {
    return this.roles;
  }
  async roleByName(name: string): Promise<{ id: string; name: string; description: string } | null> {
    return this.roles.find((r) => r.name === name) ?? null;
  }
  invalidateCache(): void {}
}

// EventPublisher stub — records what got emitted for assertions.
export class FakeEventPublisher {
  emitted: Array<{ name: string; payload: unknown }> = [];
  publish<T>(event: { name: string; payload: T }): void {
    this.emitted.push({ name: event.name, payload: event.payload });
  }
  namesOf(): string[] {
    return this.emitted.map((e) => e.name);
  }
}
