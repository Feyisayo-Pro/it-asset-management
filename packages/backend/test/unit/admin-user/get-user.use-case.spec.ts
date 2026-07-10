import { GetUserUseCase } from '../../../src/modules/auth/application/use-cases/admin/get-user.use-case';
import { UserNotFoundError } from '../../../src/common/errors/user.errors';
import { buildAdminCtx, seedUser } from './context';

describe('GetUserUseCase', () => {
  it('returns the user by id', async () => {
    const ctx = buildAdminCtx();
    const u = await seedUser(ctx, { id: 'u1' });
    const useCase = new GetUserUseCase(ctx.users);
    expect((await useCase.execute(u.id)).id).toBe('u1');
  });

  it('rejects when missing', async () => {
    const ctx = buildAdminCtx();
    const useCase = new GetUserUseCase(ctx.users);
    await expect(useCase.execute('ghost')).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
