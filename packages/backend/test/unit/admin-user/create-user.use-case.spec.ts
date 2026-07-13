import { CreateUserUseCase } from '../../../src/modules/auth/application/use-cases/admin/create-user.use-case';
import {
  EmailAlreadyExistsError,
  RoleNotFoundError,
} from '../../../src/common/errors/user.errors';
import { WeakPasswordError } from '../../../src/common/errors/auth.errors';
import { R_STORES, buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new CreateUserUseCase(
    ctx.users,
    ctx.hasher,
    ctx.ids,
    ctx.clock,
    ctx.rbac as unknown as never,
    ctx.events as unknown as never,
  );
  return { ...ctx, useCase };
};

describe('CreateUserUseCase', () => {
  it('creates the user and emits the domain event', async () => {
    const ctx = build();
    const user = await ctx.useCase.execute({
      actorUserId: 'admin-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'Ada@Example.com',
      roleId: R_STORES,
      password: 'BrandNew-Pass1!',
    });
    expect(user.email).toBe('ada@example.com');
    expect(ctx.events.namesOf()).toContain('auth.admin.user.created');
    expect(await ctx.users.findByEmail('ada@example.com')).not.toBeNull();
  });

  it('rejects a weak password', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin-1',
        firstName: 'X',
        lastName: 'Y',
        email: 'z@x.co',
        roleId: R_STORES,
        password: 'weak',
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
  });

  it('rejects a duplicate email', async () => {
    const ctx = build();
    await seedUser(ctx, { email: 'e@x.co' });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin-1',
        firstName: 'X',
        lastName: 'Y',
        email: 'E@X.CO',
        roleId: R_STORES,
        password: 'BrandNew-Pass1!',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it('rejects an unknown roleId', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin-1',
        firstName: 'X',
        lastName: 'Y',
        email: 'e@x.co',
        roleId: 'nope',
        password: 'BrandNew-Pass1!',
      }),
    ).rejects.toBeInstanceOf(RoleNotFoundError);
  });
});
