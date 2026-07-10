import { LogoutUseCase } from '../../../src/modules/auth/application/use-cases/logout.use-case';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import {
  FakeClock,
  FakeEventPublisher,
  FakeRefreshTokenRepository,
  FakeTokenService,
} from '../fakes/fakes';

const build = () => {
  const refreshTokens = new FakeRefreshTokenRepository();
  const tokens = new FakeTokenService();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const events = new FakeEventPublisher();
  const useCase = new LogoutUseCase(
    refreshTokens,
    tokens,
    clock,
    events as unknown as never,
  );
  return { useCase, refreshTokens, tokens, clock, events };
};

describe('LogoutUseCase', () => {
  it('revokes the presented refresh token and emits UserLoggedOut', async () => {
    const ctx = build();
    const raw = 'raw-token';
    const rt = RefreshToken.issue({
      id: 'rt-1',
      userId: 'u1',
      tokenHash: ctx.tokens.hashRefreshToken(raw),
      ttlSeconds: 3600,
      now: ctx.clock.now(),
    });
    await ctx.refreshTokens.save(rt);

    await ctx.useCase.execute({ userId: 'u1', refreshToken: raw });

    const persisted = ctx.refreshTokens.all()[0];
    expect(persisted.revokedAt).not.toBeNull();
    expect(ctx.events.namesOf()).toEqual(['auth.user.logged-out']);
  });

  it('with allDevices, revokes every refresh token for the user', async () => {
    const ctx = build();
    for (let i = 0; i < 3; i += 1) {
      const raw = `raw-${i}`;
      const rt = RefreshToken.issue({
        id: `rt-${i}`,
        userId: 'u1',
        tokenHash: ctx.tokens.hashRefreshToken(raw),
        ttlSeconds: 3600,
        now: ctx.clock.now(),
      });
      await ctx.refreshTokens.save(rt);
    }

    await ctx.useCase.execute({ userId: 'u1', allDevices: true });

    expect(ctx.refreshTokens.all().every((t) => t.revokedAt !== null)).toBe(
      true,
    );
  });

  it('is a safe no-op when the token belongs to a different user', async () => {
    const ctx = build();
    const raw = 'raw-token';
    const rt = RefreshToken.issue({
      id: 'rt-1',
      userId: 'someone-else',
      tokenHash: ctx.tokens.hashRefreshToken(raw),
      ttlSeconds: 3600,
      now: ctx.clock.now(),
    });
    await ctx.refreshTokens.save(rt);

    await ctx.useCase.execute({ userId: 'u1', refreshToken: raw });

    expect(ctx.refreshTokens.all()[0].revokedAt).toBeNull();
  });
});
