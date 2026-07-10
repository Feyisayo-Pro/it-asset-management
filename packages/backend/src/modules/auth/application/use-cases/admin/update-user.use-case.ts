import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { CLOCK, Clock } from '../../ports/clock.port';
import { User } from '../../../domain/entities/user.entity';
import { EventPublisher } from '../../../../../common/events/event-publisher';
import { UserUpdatedByAdminEvent } from '../../../domain/events/user-admin.events';
import {
  EmailAlreadyExistsError,
  UserNotFoundError,
} from '../../../../../common/errors/user.errors';

export interface UpdateUserCommand {
  actorUserId: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const user = await this.users.findById(command.userId);
    if (!user) throw new UserNotFoundError(command.userId);

    const changed: string[] = [];
    const patch: Parameters<User['updateProfile']>[0] = {};

    if (
      command.email !== undefined &&
      command.email.trim().toLowerCase() !== user.email
    ) {
      const emailNormalized = command.email.trim().toLowerCase();
      const clashing = await this.users.findByEmail(emailNormalized);
      if (clashing && clashing.id !== user.id) {
        throw new EmailAlreadyExistsError(emailNormalized);
      }
      patch.email = emailNormalized;
      changed.push('email');
    }
    if (
      command.firstName !== undefined &&
      command.firstName.trim() !== user.firstName
    ) {
      patch.firstName = command.firstName;
      changed.push('firstName');
    }
    if (
      command.lastName !== undefined &&
      command.lastName.trim() !== user.lastName
    ) {
      patch.lastName = command.lastName;
      changed.push('lastName');
    }

    if (changed.length === 0) return user;

    user.updateProfile(patch, this.clock.now());
    await this.users.save(user);

    this.events.publish(
      new UserUpdatedByAdminEvent({
        userId: user.id,
        updatedByUserId: command.actorUserId,
        changedFields: changed,
      }),
    );
    return user;
  }
}
