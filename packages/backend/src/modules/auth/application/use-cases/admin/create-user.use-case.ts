import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../ports/password-hasher.port';
import { ID_GENERATOR, IdGenerator } from '../../ports/id-generator.port';
import { CLOCK, Clock } from '../../ports/clock.port';
import { RbacService } from '../../../../rbac/application/rbac.service';
import { User } from '../../../domain/entities/user.entity';
import { PasswordPolicy } from '../../../domain/services/password-policy';
import { EventPublisher } from '../../../../../common/events/event-publisher';
import { UserCreatedByAdminEvent } from '../../../domain/events/user-admin.events';
import {
  EmailAlreadyExistsError,
  RoleNotFoundError,
} from '../../../../../common/errors/user.errors';

export interface CreateUserCommand {
  actorUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  password: string;
  mustChangePassword?: boolean;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rbac: RbacService,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    PasswordPolicy.assertValid(command.password);

    const emailNormalized = command.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(emailNormalized);
    if (existing) throw new EmailAlreadyExistsError(emailNormalized);

    const roles = await this.rbac.listRoles();
    if (!roles.some((r) => r.id === command.roleId)) {
      throw new RoleNotFoundError(command.roleId);
    }

    const hash = await this.hasher.hash(command.password);
    const user = User.create({
      id: this.ids.next(),
      email: emailNormalized,
      firstName: command.firstName,
      lastName: command.lastName,
      passwordHash: hash,
      roleId: command.roleId,
      mustChangePassword: command.mustChangePassword ?? false,
    });
    void this.clock.now();
    await this.users.save(user);

    this.events.publish(
      new UserCreatedByAdminEvent({
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        createdByUserId: command.actorUserId,
      }),
    );
    return user;
  }
}
