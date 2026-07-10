import { DeactivateUserUseCase } from '../../../src/modules/auth/application/use-cases/admin/deactivate-user.use-case';
import {
  CannotDeactivateLastAdminError,
  CannotDeactivateSelfError,
  UserNotFoundError,
} from '../../../src/common/errors/user.errors';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import { R_STORES, R_SUPER, buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new DeactivateUserUseCase(
    ctx.users,
    ctx.refreshTokens,
    ctx.clock,
    ctx.rbac as unknown as never,
    ctx.events as unknown as never,
  );
  return { ...ctx, useCase };
};

describe('DeactivateUserUseCase', () => {
  it('deactivates the user and revokes their refresh tokens', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'u1', roleId: R_STORES });
    const rt = RefreshToken.issue({
      id: 'rt-1',
      userId: u.id,
      tokenHash: 'x',
      ttlSeconds: 3600,
      now: ctx.clock.now(),
    });
    await ctx.refreshTokens.save(rt);

    await ctx.useCase.execute({ actorUserId: 'admin', userId: u.id });

    expect((await ctx.users.findById('u1'))?.isActive).toBe(false);
    expect(ctx.refreshTokens.all()[0].revokedAt).not.toBeNull();
    expect(ctx.events.namesOf()).toContain('auth.admin.user.deactivated');
  });

  it('rejects self-deactivation', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'me' });
    await expect(
      ctx.useCase.execute({ actorUserId: 'me', userId: u.id }),
    ).rejects.toBeInstanceOf(CannotDeactivateSelfError);
  });

  it('rejects deactivating the last active Super Admin', async () => {
    const ctx = build();
    const soleAdmin = await seedUser(ctx, { id: 'admin1', roleId: R_SUPER });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'other',
        userId: soleAdmin.id,
      }),
    ).rejects.toBeInstanceOf(CannotDeactivateLastAdminError);
  });

  it('is idempotent — deactivating an already-inactive user is a no-op', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'u1', isActive: false });
    await ctx.useCase.execute({ actorUserId: 'admin', userId: u.id });
    // No events emitted the second time around
    expect(ctx.events.emitted).toHaveLength(0);
  });

  it('rejects when the user does not exist', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({ actorUserId: 'admin', userId: 'ghost' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
