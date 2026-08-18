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
import { UserDeactivatedEvent } from '../../../domain/events/user-admin.events';
import {
  CannotDeactivateLastAdminError,
  CannotDeactivateSelfError,
  UserNotFoundError,
} from '../../../../../common/errors/user.errors';

export interface DeactivateUserCommand {
  actorUserId: string;
  userId: string;
}

@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rbac: RbacService,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<User> {
    if (command.actorUserId === command.userId) {
      throw new CannotDeactivateSelfError();
    }

    const user = await this.users.findById(command.userId);
    if (!user) throw new UserNotFoundError(command.userId);

    if (!user.isActive) return user; // idempotent

    const superAdmin = await this.rbac.roleByName(RoleName.SUPER_ADMIN);
    if (superAdmin && user.roleId === superAdmin.id) {
      const remaining = await this.users.countActiveByRole(superAdmin.id);
      if (remaining <= 1) throw new CannotDeactivateLastAdminError();
    }

    const now = this.clock.now();
    user.deactivate(now);
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id, now);

    this.events.publish(
      new UserDeactivatedEvent({
        userId: user.id,
        deactivatedByUserId: command.actorUserId,
      }),
    );
    return user;
  }
}
