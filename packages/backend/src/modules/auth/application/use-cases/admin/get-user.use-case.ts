import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';
import { UserNotFoundError } from '../../../../../common/errors/user.errors';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    return user;
  }
}
