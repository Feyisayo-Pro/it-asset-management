import { RefreshTokenUseCase } from '../../../src/modules/auth/application/use-cases/refresh-token.use-case';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  AccountDisabledError,
  InvalidRefreshTokenError,
} from '../../../src/common/errors/auth.errors';
import {
  FakeClock,
  FakeIdGenerator,
  FakeRbacService,
  FakeRefreshTokenRepository,
  FakeTokenService,
  FakeUserRepository,
} from '../fakes/fakes';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';

const build = () => {
  const users = new FakeUserRepository();
  const refreshTokens = new FakeRefreshTokenRepository();
  const tokens = new FakeTokenService();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const rbac = new FakeRbacService([
    { id: 'r1', name: 'EMPLOYEE', description: '' },
  ]);
  const useCase = new RefreshTokenUseCase(
    users,
    refreshTokens,
    tokens,
    ids,
    clock,
    rbac as unknown as never,
  );
  return { useCase, users, refreshTokens, tokens, clock, ids };
};

const seedUserAndRefreshToken = async (ctx: ReturnType<typeof build>) => {
  const user = User.create({
    id: 'u1',
    email: 'e@example.com',
    passwordHash: 'x',
    roleId: 'r1',
  });
  ctx.users.add(user);
  const raw = 'raw-preexisting';
  const rt = RefreshToken.issue({
    id: ctx.ids.next(),
    userId: user.id,
    tokenHash: ctx.tokens.hashRefreshToken(raw),
    ttlSeconds: 3600,
    now: ctx.clock.now(),
  });
  await ctx.refreshTokens.save(rt);
  return { user, raw, rt };
};

describe('RefreshTokenUseCase', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const ctx = build();
    const seed = await seedUserAndRefreshToken(ctx);

    const result = await ctx.useCase.execute({ refreshToken: seed.raw });

    expect(result.accessToken).toMatch(/^access-\d+-u1$/);
    expect(result.refreshToken).not.toBe(seed.raw);
    // Old refresh token revoked with replaced_by pointer.
    const oldToken = ctx.refreshTokens.all().find((t) => t.id === seed.rt.id);
    expect(oldToken?.revokedAt).not.toBeNull();
    expect(oldToken?.replacedById).not.toBeNull();
    // New refresh token active.
    const activeTokens = ctx.refreshTokens
      .all()
      .filter((t) => t.revokedAt === null);
    expect(activeTokens).toHaveLength(1);
  });

  it('rejects an unknown refresh token', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({ refreshToken: 'not-a-real-token' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('rejects an already-revoked refresh token', async () => {
    const ctx = build();
    const seed = await seedUserAndRefreshToken(ctx);
    seed.rt.revoke(ctx.clock.now());
    await ctx.refreshTokens.save(seed.rt);
    await expect(
      ctx.useCase.execute({ refreshToken: seed.raw }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('rejects an expired refresh token', async () => {
    const ctx = build();
    const seed = await seedUserAndRefreshToken(ctx);
    ctx.clock.advance(2 * 3600 * 1000);
    await expect(
      ctx.useCase.execute({ refreshToken: seed.raw }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('rejects when the owning user is disabled', async () => {
    const ctx = build();
    const seed = await seedUserAndRefreshToken(ctx);
    seed.user.deactivate(ctx.clock.now());
    await ctx.users.save(seed.user);
    await expect(
      ctx.useCase.execute({ refreshToken: seed.raw }),
    ).rejects.toBeInstanceOf(AccountDisabledError);
  });
});
