import { Inject, Injectable } from '@nestjs/common';
import {
  ListUsersParams,
  ListUsersResult,
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(params: ListUsersParams): Promise<ListUsersResult> {
    return this.users.list(params);
  }
}
