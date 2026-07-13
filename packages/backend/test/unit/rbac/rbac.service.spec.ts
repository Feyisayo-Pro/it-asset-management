import { RbacService } from '../../../src/modules/rbac/application/rbac.service';
import { Role } from '../../../src/modules/rbac/domain/entities/role.entity';
import { RoleName } from '../../../src/modules/rbac/domain/enums/role-name.enum';
import { RoleRepository } from '../../../src/modules/rbac/domain/repositories/role.repository';
import { PermissionRepository } from '../../../src/modules/rbac/domain/repositories/permission.repository';

class FakeRoleRepo implements RoleRepository {
  private roles = [new Role('r1', RoleName.SUPER_ADMIN, 'sa')];
  async findById(id: string) {
    return this.roles.find((r) => r.id === id) ?? null;
  }
  async findByName(name: RoleName) {
    return this.roles.find((r) => r.name === name) ?? null;
  }
  async listAll() {
    return this.roles;
  }
}

class FakePermRepo implements PermissionRepository {
  public calls = 0;
  async listKeysForRole(_roleId: string) {
    this.calls += 1;
    return ['user:manage', 'asset:manage'];
  }
  async listAllKeys() {
    return ['user:manage', 'asset:manage'];
  }
}

describe('RbacService', () => {
  it('returns permissions for a role', async () => {
    const svc = new RbacService(new FakeRoleRepo(), new FakePermRepo());
    expect(await svc.getPermissionsForRole('r1')).toEqual([
      'user:manage',
      'asset:manage',
    ]);
  });

  it('caches per-role lookups within the TTL window', async () => {
    const perms = new FakePermRepo();
    const svc = new RbacService(new FakeRoleRepo(), perms);
    await svc.getPermissionsForRole('r1');
    await svc.getPermissionsForRole('r1');
    expect(perms.calls).toBe(1);
  });

  it('invalidateCache forces a refresh', async () => {
    const perms = new FakePermRepo();
    const svc = new RbacService(new FakeRoleRepo(), perms);
    await svc.getPermissionsForRole('r1');
    svc.invalidateCache('r1');
    await svc.getPermissionsForRole('r1');
    expect(perms.calls).toBe(2);
  });

  it('roleByName returns the seeded role', async () => {
    const svc = new RbacService(new FakeRoleRepo(), new FakePermRepo());
    const role = await svc.roleByName(RoleName.SUPER_ADMIN);
    expect(role?.id).toBe('r1');
  });
});
