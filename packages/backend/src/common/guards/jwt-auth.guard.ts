import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import {
  TOKEN_SERVICE,
  TokenService,
  AccessTokenClaims,
} from '../../modules/auth/application/ports/token-service.port';
import { RbacService } from '../../modules/rbac/application/rbac.service';
import { asyncContext } from '../utils/async-context';

/**
 * JwtAuthGuard — global guard. Verifies the Bearer access token,
 * hydrates req.user with role + permissions, and rejects with 401
 * on any failure. Skipped on @Public() handlers.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    let claims: AccessTokenClaims;
    try {
      claims = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const permissions = await this.rbacService.getPermissionsForRole(
      claims.roleId,
    );

    const user: AuthenticatedUser = {
      id: claims.sub,
      email: claims.email,
      roleId: claims.roleId,
      roleName: claims.roleName,
      permissions,
    };
    (request as Request & { user: AuthenticatedUser }).user = user;

    asyncContext.set({ userId: user.id, roleName: user.roleName });
    return true;
  }
}

function extractBearer(request: Request): string | undefined {
  const header = request.header('authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token.trim();
}
