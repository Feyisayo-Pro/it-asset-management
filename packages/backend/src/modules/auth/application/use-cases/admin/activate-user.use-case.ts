import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { CLOCK, Clock } from '../../ports/clock.port';
import { User } from '../../../domain/entities/user.entity';
import { EventPublisher } from '../../../../../common/events/event-publisher';
import { UserActivatedEvent } from '../../../domain/events/user-admin.events';
import { UserNotFoundError } from '../../../../../common/errors/user.errors';

export interface ActivateUserCommand {
  actorUserId: string;
  userId: string;
}

@Injectable()
export class ActivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ActivateUserCommand): Promise<User> {
    const user = await this.users.findById(command.userId);
    if (!user) throw new UserNotFoundError(command.userId);
    if (user.isActive) return user; // idempotent

    user.activate(this.clock.now());
    await this.users.save(user);

    this.events.publish(
      new UserActivatedEvent({
        userId: user.id,
        activatedByUserId: command.actorUserId,
      }),
    );
    return user;
  }
}
