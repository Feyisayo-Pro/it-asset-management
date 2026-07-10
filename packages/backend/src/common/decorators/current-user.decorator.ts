import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

/**
 * Injects the authenticated user into a controller handler parameter.
 * Populated by JwtAuthGuard on successful token validation.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    if (!request.user) {
      throw new Error('CurrentUser used on an unauthenticated route');
    }
    return request.user;
  },
);
