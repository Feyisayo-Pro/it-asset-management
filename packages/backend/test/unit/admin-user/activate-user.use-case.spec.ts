import { ActivateUserUseCase } from '../../../src/modules/auth/application/use-cases/admin/activate-user.use-case';
import { UserNotFoundError } from '../../../src/common/errors/user.errors';
import { buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new ActivateUserUseCase(
    ctx.users,
    ctx.clock,
    ctx.events as unknown as never,
  );
  return { ...ctx, useCase };
};

describe('ActivateUserUseCase', () => {
  it('activates an inactive user', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'u1', isActive: false });
    await ctx.useCase.execute({ actorUserId: 'admin', userId: u.id });
    expect((await ctx.users.findById('u1'))?.isActive).toBe(true);
    expect(ctx.events.namesOf()).toContain('auth.admin.user.activated');
  });

  it('is idempotent for already-active users', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'u1', isActive: true });
    await ctx.useCase.execute({ actorUserId: 'admin', userId: u.id });
    expect(ctx.events.emitted).toHaveLength(0);
  });

  it('rejects when the user does not exist', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({ actorUserId: 'admin', userId: 'ghost' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
