import { ForgotPasswordUseCase } from '../../../src/modules/auth/application/use-cases/forgot-password.use-case';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  FakeClock,
  FakeConfigService,
  FakeEventPublisher,
  FakeIdGenerator,
  FakeMailService,
  FakePasswordResetTokenRepository,
  FakeTokenService,
  FakeUserRepository,
} from '../fakes/fakes';

const build = () => {
  const users = new FakeUserRepository();
  const resetTokens = new FakePasswordResetTokenRepository();
  const tokens = new FakeTokenService();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const mail = new FakeMailService();
  const events = new FakeEventPublisher();
  const config = new FakeConfigService();
  const useCase = new ForgotPasswordUseCase(
    users,
    resetTokens,
    tokens,
    ids,
    clock,
    mail,
    events as unknown as never,
    config as unknown as never,
  );
  return { useCase, users, resetTokens, tokens, mail, events };
};

describe('ForgotPasswordUseCase', () => {
  it('mints a reset token and dispatches an email for a known user', async () => {
    const ctx = build();
    const user = User.create({
      id: 'u1',
      email: 'e@example.com',
      firstName: 'First',
      lastName: 'Last',
      passwordHash: 'x',
      roleId: 'r1',
    });
    ctx.users.add(user);

    await ctx.useCase.execute({ email: 'E@Example.com' });

    expect(ctx.mail.resetCalls).toHaveLength(1);
    expect(ctx.mail.resetCalls[0].resetUrl).toContain('raw-reset-1');
    expect(ctx.events.namesOf()).toEqual(['auth.password-reset.requested']);
  });

  it('is silent for an unknown user (no user enumeration)', async () => {
    const ctx = build();
    await ctx.useCase.execute({ email: 'nobody@example.com' });
    expect(ctx.mail.resetCalls).toHaveLength(0);
    expect(ctx.events.emitted).toHaveLength(0);
  });

  it('is silent for a disabled user', async () => {
    const ctx = build();
    const user = User.create({
      id: 'u1',
      email: 'e@example.com',
      firstName: 'First',
      lastName: 'Last',
      passwordHash: 'x',
      roleId: 'r1',
    });
    user.deactivate(new Date());
    ctx.users.add(user);
    await ctx.useCase.execute({ email: 'e@example.com' });
    expect(ctx.mail.resetCalls).toHaveLength(0);
  });

  it('invalidates prior tokens for the same user when a new request arrives', async () => {
    const ctx = build();
    const user = User.create({
      id: 'u1',
      email: 'e@example.com',
      firstName: 'First',
      lastName: 'Last',
      passwordHash: 'x',
      roleId: 'r1',
    });
    ctx.users.add(user);

    await ctx.useCase.execute({ email: 'e@example.com' });
    await ctx.useCase.execute({ email: 'e@example.com' });

    // First token should be marked used (invalidated).
    const firstHash = ctx.tokens.hashResetToken('raw-reset-1');
    const first = await ctx.resetTokens.findByHash(firstHash);
    expect(first?.usedAt).not.toBeNull();

    const secondHash = ctx.tokens.hashResetToken('raw-reset-2');
    const second = await ctx.resetTokens.findByHash(secondHash);
    expect(second?.usedAt).toBeNull();
  });
});
