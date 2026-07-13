import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '../../../src/common/guards/rbac.guard';
import { RoleName } from '../../../src/modules/rbac/domain/enums/role-name.enum';

const contextFor = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RbacGuard', () => {
  const user = {
    id: 'u1',
    email: 'a',
    roleId: 'r',
    roleName: RoleName.STORES_OFFICER,
    permissions: ['asset:manage', 'employee:read'],
  };

  it('allows when no role or permission metadata is set', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as never);
    const guard = new RbacGuard(reflector);
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('denies when the role does not match', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === 'auth:roles') return [RoleName.SUPER_ADMIN];
        if (key === 'auth:permissions') return undefined;
        return undefined;
      });
    const guard = new RbacGuard(reflector);
    expect(() => guard.canActivate(contextFor(user))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when a required permission is missing', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === 'auth:roles') return undefined;
        if (key === 'auth:permissions') return ['user:manage'];
        return undefined;
      });
    const guard = new RbacGuard(reflector);
    expect(() => guard.canActivate(contextFor(user))).toThrow(
      ForbiddenException,
    );
  });

  it('allows when both role and permissions are satisfied', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === 'auth:roles') return [RoleName.STORES_OFFICER];
        if (key === 'auth:permissions') return ['asset:manage'];
        return undefined;
      });
    const guard = new RbacGuard(reflector);
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('denies when unauthenticated (no req.user) and metadata is set', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === 'auth:roles') return [RoleName.SUPER_ADMIN];
        return undefined;
      });
    const guard = new RbacGuard(reflector);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
