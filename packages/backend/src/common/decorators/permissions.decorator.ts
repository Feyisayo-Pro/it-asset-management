import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'auth:permissions';

/**
 * Restricts a handler to callers who hold ALL listed permissions.
 * Enforced by RbacGuard.
 */
export const RequirePermissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
