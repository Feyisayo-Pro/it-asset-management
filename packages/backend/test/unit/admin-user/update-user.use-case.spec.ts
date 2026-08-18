import { UpdateUserUseCase } from '../../../src/modules/auth/application/use-cases/admin/update-user.use-case';
import {
  EmailAlreadyExistsError,
  UserNotFoundError,
} from '../../../src/common/errors/user.errors';
import { buildAdminCtx, seedUser } from './context';

const build = () => {
  const ctx = buildAdminCtx();
  const useCase = new UpdateUserUseCase(
    ctx.users,
    ctx.clock,
    ctx.events as unknown as never,
  );
  return { ...ctx, useCase };
};

describe('UpdateUserUseCase', () => {
  it('updates name and email, emits event with changed field list', async () => {
    const ctx = build();
    const u = await seedUser(ctx, {
      id: 'u1',
      firstName: 'Old',
      lastName: 'Name',
      email: 'old@x.co',
    });

    const updated = await ctx.useCase.execute({
      actorUserId: 'admin',
      userId: u.id,
      firstName: 'New',
      email: 'New@X.co',
    });

    expect(updated.firstName).toBe('New');
    expect(updated.lastName).toBe('Name');
    expect(updated.email).toBe('new@x.co');
    const event = ctx.events.emitted.find(
      (e) => e.name === 'auth.admin.user.updated',
    );
    expect(event?.payload).toMatchObject({
      changedFields: expect.arrayContaining(['firstName', 'email']),
    });
  });

  it('is a no-op event-wise when nothing actually changes', async () => {
    const ctx = build();
    const u = await seedUser(ctx, {
      firstName: 'Same',
      lastName: 'Same',
      email: 'same@x.co',
    });
    await ctx.useCase.execute({
      actorUserId: 'admin',
      userId: u.id,
      firstName: 'Same',
      lastName: 'Same',
      email: 'same@x.co',
    });
    expect(ctx.events.emitted).toHaveLength(0);
  });

  it('rejects a clashing email that belongs to a different user', async () => {
    const ctx = build();
    const target = await seedUser(ctx, { id: 'u1', email: 'a@x.co' });
    await seedUser(ctx, { id: 'u2', email: 'b@x.co' });
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin',
        userId: target.id,
        email: 'b@x.co',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it('rejects when the target user does not exist', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        actorUserId: 'admin',
        userId: 'ghost',
        firstName: 'X',
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
