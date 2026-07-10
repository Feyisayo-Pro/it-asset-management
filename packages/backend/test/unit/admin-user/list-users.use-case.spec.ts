import { ListUsersUseCase } from '../../../src/modules/auth/application/use-cases/admin/list-users.use-case';
import { R_STORES, R_SUPER, buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new ListUsersUseCase(ctx.users);
  return { ...ctx, useCase };
};

describe('ListUsersUseCase', () => {
  it('paginates and returns total count', async () => {
    const ctx = build();
    for (let i = 0; i < 25; i += 1) {
      await seedUser(ctx, {
        id: `u${i}`,
        email: `user-${i}@x.co`,
        lastName: `Last${String(i).padStart(2, '0')}`,
      });
    }
    const page1 = await ctx.useCase.execute({ page: 1, pageSize: 10 });
    expect(page1.total).toBe(25);
    expect(page1.data).toHaveLength(10);
    const page3 = await ctx.useCase.execute({ page: 3, pageSize: 10 });
    expect(page3.data).toHaveLength(5);
  });

  it('filters by role and active status', async () => {
    const ctx = build();
    await seedUser(ctx, { id: 'a', roleId: R_SUPER });
    await seedUser(ctx, { id: 'b', roleId: R_STORES });
    await seedUser(ctx, { id: 'c', roleId: R_STORES, isActive: false });

    const admins = await ctx.useCase.execute({
      page: 1,
      pageSize: 20,
      roleId: R_SUPER,
    });
    expect(admins.total).toBe(1);

    const activeStores = await ctx.useCase.execute({
      page: 1,
      pageSize: 20,
      roleId: R_STORES,
      isActive: true,
    });
    expect(activeStores.total).toBe(1);
  });

  it('searches by name or email substring', async () => {
    const ctx = build();
    await seedUser(ctx, { firstName: 'Ada', lastName: 'Lovelace' });
    await seedUser(ctx, { firstName: 'Grace', lastName: 'Hopper' });
    const result = await ctx.useCase.execute({
      page: 1,
      pageSize: 20,
      search: 'hopp',
    });
    expect(result.total).toBe(1);
    expect(result.data[0].lastName).toBe('Hopper');
  });
});
