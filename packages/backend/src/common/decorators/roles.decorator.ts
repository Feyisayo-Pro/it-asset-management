import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../modules/rbac/domain/enums/role-name.enum';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts a handler to the given role names. Enforced by RbacGuard.
 * Empty list = allow any authenticated role.
 */
export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
