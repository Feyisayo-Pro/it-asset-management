import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../domain/enums/permission.enum';
import { RbacService } from '../application/rbac.service';

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('me/permissions')
  async myPermissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ roleName: string; permissions: string[] }> {
    return { roleName: user.roleName, permissions: user.permissions };
  }

  @Get('roles')
  @RequirePermissions(Permission.RbacRead)
  async listRoles(): Promise<
    Array<{ id: string; name: string; description: string }>
  > {
    const roles = await this.rbac.listRoles();
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
  }
}
