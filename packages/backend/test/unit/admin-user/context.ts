import { RoleName } from '../../../src/modules/rbac/domain/enums/role-name.enum';
import { User } from '../../../src/modules/auth/domain/entities/user.entity';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeRbacService,
  FakeRefreshTokenRepository,
  FakeUserRepository,
} from '../fakes/fakes';

export const R_SUPER = 'r-super';
export const R_STORES = 'r-stores';

export interface AdminCtx {
  users: FakeUserRepository;
  refreshTokens: FakeRefreshTokenRepository;
  hasher: FakePasswordHasher;
  ids: FakeIdGenerator;
  clock: FakeClock;
  rbac: FakeRbacService;
  events: FakeEventPublisher;
}

export const buildAdminCtx = (): AdminCtx => {
  return {
    users: new FakeUserRepository(),
    refreshTokens: new FakeRefreshTokenRepository(),
    hasher: new FakePasswordHasher(),
    ids: new FakeIdGenerator(),
    clock: new FakeClock(new Date('2026-07-10T00:00:00Z')),
    rbac: new FakeRbacService([
      { id: R_SUPER, name: RoleName.SUPER_ADMIN, description: 'sa' },
      { id: R_STORES, name: RoleName.STORES_OFFICER, description: 'st' },
    ]),
    events: new FakeEventPublisher(),
  };
};

export const seedUser = async (
  ctx: AdminCtx,
  overrides: Partial<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    isActive: boolean;
  }> = {},
): Promise<User> => {
  const passwordHash = await ctx.hasher.hash('SeedPassword-1!');
  const user = User.create({
    id: overrides.id ?? `u-${ctx.users['byId'].size + 1}`,
    email: overrides.email ?? `user-${ctx.users['byId'].size + 1}@x.co`,
    firstName: overrides.firstName ?? 'First',
    lastName: overrides.lastName ?? 'Last',
    passwordHash,
    roleId: overrides.roleId ?? R_STORES,
  });
  if (overrides.isActive === false) user.deactivate(ctx.clock.now());
  ctx.users.add(user);
  return user;
};
