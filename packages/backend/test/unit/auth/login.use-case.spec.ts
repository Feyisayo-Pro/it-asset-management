import { LoginUseCase } from '../../../src/modules/auth/application/use-cases/login.use-case';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  AccountDisabledError,
  AccountLockedError,
  InvalidCredentialsError,
} from '../../../src/common/errors/auth.errors';
import {
  FakeClock,
  FakeConfigService,
  FakeEventPublisher,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeRbacService,
  FakeRefreshTokenRepository,
  FakeTokenService,
  FakeUserRepository,
} from '../fakes/fakes';

const build = () => {
  const users = new FakeUserRepository();
  const refreshTokens = new FakeRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const rbac = new FakeRbacService([
    { id: 'r1', name: 'EMPLOYEE', description: '' },
  ]);
  const events = new FakeEventPublisher();
  const config = new FakeConfigService();

  const useCase = new LoginUseCase(
    users,
    refreshTokens,
    hasher,
    tokens,
    ids,
    clock,
    // Type erasure: fakes conform structurally to the ports the use case injects.
    rbac as unknown as never,
    events as unknown as never,
    config as unknown as never,
  );
  return { useCase, users, refreshTokens, hasher, tokens, clock, events };
};

const seedUser = async (
  users: FakeUserRepository,
  hasher: FakePasswordHasher,
  overrides: Partial<{ isActive: boolean }> = {},
): Promise<User> => {
  const passwordHash = await hasher.hash('CorrectHorse-Battery9!');
  const user = User.create({
    id: 'u1',
    email: 'e@example.com',
      firstName: 'First',
      lastName: 'Last',
    passwordHash,
    roleId: 'r1',
  });
  if (overrides.isActive === false) user.deactivate(new Date());
  users.add(user);
  return user;
};

describe('LoginUseCase', () => {
  it('issues access + refresh tokens on correct credentials', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher);

    const result = await ctx.useCase.execute({
      email: 'E@Example.com',
      password: 'CorrectHorse-Battery9!',
    });

    expect(result.accessToken).toMatch(/^access-\d+-u1$/);
    expect(result.refreshToken).toBe('raw-refresh-1');
    expect(result.user).toMatchObject({
      id: 'u1',
      email: 'e@example.com',
      roleName: 'EMPLOYEE',
      mustChangePassword: false,
    });
    expect(ctx.refreshTokens.all()).toHaveLength(1);
    expect(ctx.events.namesOf()).toContain('auth.user.logged-in');
  });

  it('rejects unknown users with InvalidCredentials and does not enumerate', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({ email: 'nope@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.events.namesOf()).toEqual(['auth.login.failed']);
  });

  it('increments the failure counter on bad password', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher);
    await expect(
      ctx.useCase.execute({ email: 'e@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    const user = await ctx.users.findByEmail('e@example.com');
    expect(user?.failedLoginAttempts).toBe(1);
  });

  it('locks the account at the configured threshold and emits AccountLocked', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher);
    for (let i = 0; i < 3; i += 1) {
      await expect(
        ctx.useCase.execute({ email: 'e@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    const user = await ctx.users.findByEmail('e@example.com');
    expect(user?.isLockedAt(ctx.clock.now())).toBe(true);
    expect(ctx.events.namesOf()).toContain('auth.account.locked');
  });

  it('rejects with AccountLocked while the window is active', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher);
    for (let i = 0; i < 3; i += 1) {
      await expect(
        ctx.useCase.execute({ email: 'e@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    await expect(
      ctx.useCase.execute({
        email: 'e@example.com',
        password: 'CorrectHorse-Battery9!',
      }),
    ).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('allows login after the lockout window elapses', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher);
    for (let i = 0; i < 3; i += 1) {
      await expect(
        ctx.useCase.execute({ email: 'e@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    ctx.clock.advance(16 * 60_000);
    const ok = await ctx.useCase.execute({
      email: 'e@example.com',
      password: 'CorrectHorse-Battery9!',
    });
    expect(ok.accessToken).toBeDefined();
  });

  it('rejects a disabled account', async () => {
    const ctx = build();
    await seedUser(ctx.users, ctx.hasher, { isActive: false });
    await expect(
      ctx.useCase.execute({
        email: 'e@example.com',
        password: 'CorrectHorse-Battery9!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledError);
  });
});
