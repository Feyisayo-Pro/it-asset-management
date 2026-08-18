import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { RoleName } from '../../modules/rbac/domain/enums/role-name.enum';

/**
 * RbacGuard — enforces @Roles() and @RequirePermissions() metadata.
 * Runs after JwtAuthGuard has populated req.user. A user must satisfy
 * BOTH the role list (if any) and the full permission list (if any).
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const roles = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const permissions = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length && !permissions?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: AuthenticatedUser }).user;
    if (!user) throw new ForbiddenException('Authentication required');

    if (roles?.length && !roles.includes(user.roleName as RoleName)) {
      throw new ForbiddenException('Role not permitted');
    }
    if (permissions?.length) {
      const missing = permissions.filter(
        (perm) => !user.permissions.includes(perm),
      );
      if (missing.length > 0) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return true;
  }
}
