import { ChangeUserRoleUseCase } from '../../../src/modules/auth/application/use-cases/admin/change-user-role.use-case';
import {
  CannotChangeOwnRoleError,
  CannotDemoteLastAdminError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../../../src/common/errors/user.errors';
import { RefreshToken } from '../../../src/modules/auth/domain/entities/refresh-token.entity';
import { R_STORES, R_SUPER, buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new ChangeUserRoleUseCase(
    ctx.users,
    ctx.refreshTokens,
    ctx.clock,
    ctx.rbac as unknown as never,
    ctx.events as unknown as never,
  );
  return { ...ctx, useCase };
};

describe('ChangeUserRoleUseCase', () => {
  it('changes the role and revokes all refresh tokens', async () => {
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

    await ctx.useCase.execute({
      actorUserId: 'admin',
      userId: u.id,
      newRoleId: R_SUPER,
    });

    const updated = await ctx.users.findById('u1');
    expect(updated?.roleId).toBe(R_SUPER);
    expect(ctx.refreshTokens.all()[0].revokedAt).not.toBeNull();
    expect(ctx.events.namesOf()).toContain('auth.admin.user.role-changed');
  });

  it('rejects when actor tries to change their own role', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'me', roleId: R_SUPER });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'me',
        userId: u.id,
        newRoleId: R_STORES,
      }),
    ).rejects.toBeInstanceOf(CannotChangeOwnRoleError);
  });

  it('rejects demoting the last active Super Admin', async () => {
    const ctx = build();
    const soleAdmin = await seedUser(ctx, {
      id: 'admin1',
      roleId: R_SUPER,
    });
    // A deactivated other admin does not count
    await seedUser(ctx, {
      id: 'admin2',
      roleId: R_SUPER,
      isActive: false,
    });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'someone-else',
        userId: soleAdmin.id,
        newRoleId: R_STORES,
      }),
    ).rejects.toBeInstanceOf(CannotDemoteLastAdminError);
  });

  it('allows demotion when another active Super Admin exists', async () => {
    const ctx = build();
    const target = await seedUser(ctx, { id: 'admin1', roleId: R_SUPER });
    await seedUser(ctx, { id: 'admin2', roleId: R_SUPER });
    await ctx.useCase.execute({
      actorUserId: 'someone-else',
      userId: target.id,
      newRoleId: R_STORES,
    });
    expect((await ctx.users.findById(target.id))?.roleId).toBe(R_STORES);
  });

  it('rejects when the target user does not exist', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin',
        userId: 'ghost',
        newRoleId: R_STORES,
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('rejects an unknown newRoleId', async () => {
    const ctx = build();
    const u = await seedUser(ctx, { id: 'u1' });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin',
        userId: u.id,
        newRoleId: 'nope',
      }),
    ).rejects.toBeInstanceOf(RoleNotFoundError);
  });
});
