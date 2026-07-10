import { ResetPasswordUseCase } from '../../../src/modules/auth/application/use-cases/reset-password.use-case';
import { PasswordResetToken } from '../../../src/modules/auth/domain/entities/password-reset-token.entity';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  InvalidPasswordResetTokenError,
  WeakPasswordError,
} from '../../../src/common/errors/auth.errors';
import {
  FakeClock,
  FakeEventPublisher,
  FakeMailService,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeRefreshTokenRepository,
  FakeTokenService,
  FakeUserRepository,
} from '../fakes/fakes';

const build = () => {
  const users = new FakeUserRepository();
  const resetTokens = new FakePasswordResetTokenRepository();
  const refreshTokens = new FakeRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const mail = new FakeMailService();
  const events = new FakeEventPublisher();
  const useCase = new ResetPasswordUseCase(
    users,
    resetTokens,
    refreshTokens,
    hasher,
    tokens,
    clock,
    mail,
    events as unknown as never,
  );
  return {
    useCase,
    users,
    resetTokens,
    refreshTokens,
    hasher,
    tokens,
    clock,
    mail,
    events,
  };
};

const seed = async (ctx: ReturnType<typeof build>) => {
  const user = User.create({
    id: 'u1',
    email: 'e@example.com',
    passwordHash: await ctx.hasher.hash('OldPass-Word12!'),
    roleId: 'r1',
  });
  ctx.users.add(user);
  const raw = 'raw-token-abc';
  const token = PasswordResetToken.issue({
    id: 'rt-1',
    userId: user.id,
    tokenHash: ctx.tokens.hashResetToken(raw),
    ttlMinutes: 30,
    now: ctx.clock.now(),
  });
  await ctx.resetTokens.save(token);

  // Seed one active refresh token to prove it gets revoked.
  const activeRt = RefreshToken.issue({
    id: 'rf-1',
    userId: user.id,
    tokenHash: 'existing-hash',
    ttlSeconds: 3600,
    now: ctx.clock.now(),
  });
  await ctx.refreshTokens.save(activeRt);
  return { user, raw, token };
};

describe('ResetPasswordUseCase', () => {
  it('changes password, marks token used, revokes all sessions, notifies user', async () => {
    const ctx = build();
    const s = await seed(ctx);

    await ctx.useCase.execute({
      token: s.raw,
      newPassword: 'NewStrong-Pass1!',
    });

    const updated = await ctx.users.findById('u1');
    expect(updated?.passwordHash).toBe('hash(NewStrong-Pass1!)');
    const usedToken = await ctx.resetTokens.findByHash(
      ctx.tokens.hashResetToken(s.raw),
    );
    expect(usedToken?.usedAt).not.toBeNull();
    expect(
      ctx.refreshTokens.all().every((t) => t.revokedAt !== null),
    ).toBe(true);
    expect(ctx.mail.changedCalls).toHaveLength(1);
    expect(ctx.events.namesOf()).toEqual(
      expect.arrayContaining([
        'auth.password.changed',
        'auth.password-reset.completed',
      ]),
    );
  });

  it('rejects a weak new password before touching the token', async () => {
    const ctx = build();
    const s = await seed(ctx);
    await expect(
      ctx.useCase.execute({ token: s.raw, newPassword: 'weak' }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    const persisted = await ctx.resetTokens.findByHash(
      ctx.tokens.hashResetToken(s.raw),
    );
    expect(persisted?.usedAt).toBeNull();
  });

  it('rejects an unknown token', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({ token: 'no-such', newPassword: 'NewStrong-Pass1!' }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it('rejects an expired token', async () => {
    const ctx = build();
    const s = await seed(ctx);
    ctx.clock.advance(31 * 60_000);
    await expect(
      ctx.useCase.execute({ token: s.raw, newPassword: 'NewStrong-Pass1!' }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it('rejects a token that was already used', async () => {
    const ctx = build();
    const s = await seed(ctx);
    await ctx.useCase.execute({
      token: s.raw,
      newPassword: 'NewStrong-Pass1!',
    });
    await expect(
      ctx.useCase.execute({
        token: s.raw,
        newPassword: 'AnotherStrong-Pass1!',
      }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });
});
