import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { CLOCK, Clock } from '../../ports/clock.port';
import { User } from '../../../domain/entities/user.entity';
import { RbacService } from '../../../../rbac/application/rbac.service';
import { RoleName } from '../../../../rbac/domain/enums/role-name.enum';
import { EventPublisher } from '../../../../../common/events/event-publisher';
import { UserRoleChangedEvent } from '../../../domain/events/user-admin.events';
import {
  CannotChangeOwnRoleError,
  CannotDemoteLastAdminError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../../../../../common/errors/user.errors';

export interface ChangeUserRoleCommand {
  actorUserId: string;
  userId: string;
  newRoleId: string;
}

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rbac: RbacService,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ChangeUserRoleCommand): Promise<User> {
    if (command.actorUserId === command.userId) {
      throw new CannotChangeOwnRoleError();
    }

    const user = await this.users.findById(command.userId);
    if (!user) throw new UserNotFoundError(command.userId);

    const roles = await this.rbac.listRoles();
    const newRole = roles.find((r) => r.id === command.newRoleId);
    if (!newRole) throw new RoleNotFoundError(command.newRoleId);

    if (user.roleId === command.newRoleId) return user;

    // Prevent demoting the last active Super Admin.
    const superAdmin = await this.rbac.roleByName(RoleName.SUPER_ADMIN);
    if (
      superAdmin &&
      user.roleId === superAdmin.id &&
      newRole.name !== RoleName.SUPER_ADMIN
    ) {
      const remaining = await this.users.countActiveByRole(superAdmin.id);
      if (remaining <= 1) throw new CannotDemoteLastAdminError();
    }

    const fromRoleId = user.roleId;
    const now = this.clock.now();
    user.changeRole(command.newRoleId, now);
    await this.users.save(user);

    // Revoke every active refresh token so the new access token issued
    // on next login carries the new role / permission set.
    await this.refreshTokens.revokeAllForUser(user.id, now);

    this.rbac.invalidateCache(fromRoleId);
    this.rbac.invalidateCache(command.newRoleId);

    this.events.publish(
      new UserRoleChangedEvent({
        userId: user.id,
        fromRoleId,
        toRoleId: command.newRoleId,
        changedByUserId: command.actorUserId,
      }),
    );
    return user;
  }
}
