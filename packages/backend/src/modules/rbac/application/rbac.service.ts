import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../domain/repositories/role.repository';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../domain/repositories/permission.repository';
import { Role } from '../domain/entities/role.entity';
import { RoleName } from '../domain/enums/role-name.enum';

/**
 * RbacService — resolves the permission set for a role, cached
 * in-process for a short TTL to keep the hot path (every request)
 * off the DB. Cache is invalidated on role/permission mutations
 * (none in M2, but the hook is here).
 */
@Injectable()
export class RbacService {
  private static readonly TTL_MS = 5 * 60 * 1_000;
  private readonly cache = new Map<
    string,
    { expiresAt: number; permissions: string[] }
  >();

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepository,
  ) {}

  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const cached = this.cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;
    const perms = await this.permissions.listKeysForRole(roleId);
    this.cache.set(roleId, {
      expiresAt: Date.now() + RbacService.TTL_MS,
      permissions: perms,
    });
    return perms;
  }

  async roleByName(name: RoleName): Promise<Role | null> {
    return this.roles.findByName(name);
  }

  async listRoles(): Promise<Role[]> {
    return this.roles.listAll();
  }

  invalidateCache(roleId?: string): void {
    if (roleId) this.cache.delete(roleId);
    else this.cache.clear();
  }
}
