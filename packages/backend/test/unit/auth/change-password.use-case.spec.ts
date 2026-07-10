import { ChangePasswordUseCase } from '../../../src/modules/auth/application/use-cases/change-password.use-case';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import {
  InvalidCredentialsError,
  SamePasswordError,
  WeakPasswordError,
} from '../../../src/common/errors/auth.errors';
import {
  FakeClock,
  FakeEventPublisher,
  FakeMailService,
  FakePasswordHasher,
  FakeRefreshTokenRepository,
  FakeUserRepository,
} from '../fakes/fakes';

const build = () => {
  const users = new FakeUserRepository();
  const refreshTokens = new FakeRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const mail = new FakeMailService();
  const events = new FakeEventPublisher();
  const useCase = new ChangePasswordUseCase(
    users,
    refreshTokens,
    hasher,
    clock,
    mail,
    events as unknown as never,
  );
  return { useCase, users, refreshTokens, hasher, mail, events, clock };
};

const seed = async (ctx: ReturnType<typeof build>) => {
  const user = User.create({
    id: 'u1',
    email: 'e@example.com',
    passwordHash: await ctx.hasher.hash('CurrentPass-9!X'),
    roleId: 'r1',
  });
  ctx.users.add(user);
  const rt = RefreshToken.issue({
    id: 'rf-1',
    userId: user.id,
    tokenHash: 'hash',
    ttlSeconds: 3600,
    now: ctx.clock.now(),
  });
  await ctx.refreshTokens.save(rt);
  return user;
};

describe('ChangePasswordUseCase', () => {
  it('changes password, revokes all refresh tokens, sends confirmation', async () => {
    const ctx = build();
    await seed(ctx);
    await ctx.useCase.execute({
      userId: 'u1',
      currentPassword: 'CurrentPass-9!X',
      newPassword: 'BrandNew-Pass9!X',
    });
    const updated = await ctx.users.findById('u1');
    expect(updated?.passwordHash).toBe('hash(BrandNew-Pass9!X)');
    expect(
      ctx.refreshTokens.all().every((t) => t.revokedAt !== null),
    ).toBe(true);
    expect(ctx.mail.changedCalls).toHaveLength(1);
    expect(ctx.events.namesOf()).toContain('auth.password.changed');
  });

  it('rejects when the current password is wrong', async () => {
    const ctx = build();
    await seed(ctx);
    await expect(
      ctx.useCase.execute({
        userId: 'u1',
        currentPassword: 'nope',
        newPassword: 'BrandNew-Pass9!X',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects when the new password matches the current one', async () => {
    const ctx = build();
    await seed(ctx);
    await expect(
      ctx.useCase.execute({
        userId: 'u1',
        currentPassword: 'CurrentPass-9!X',
        newPassword: 'CurrentPass-9!X',
      }),
    ).rejects.toBeInstanceOf(SamePasswordError);
  });

  it('rejects a weak new password', async () => {
    const ctx = build();
    await seed(ctx);
    await expect(
      ctx.useCase.execute({
        userId: 'u1',
        currentPassword: 'CurrentPass-9!X',
        newPassword: 'weak',
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
  });
});
