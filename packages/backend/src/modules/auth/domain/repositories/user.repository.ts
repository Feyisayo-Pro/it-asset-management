import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type UserSortField = 'lastName' | 'email' | 'lastLoginAt' | 'createdAt';

export interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: string;
  isActive?: boolean;
  sort?: { field: UserSortField; direction: 'asc' | 'desc' };
}

export interface ListUsersResult {
  data: User[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  countAll(): Promise<number>;
  countActiveByRole(roleId: string): Promise<number>;
  list(params: ListUsersParams): Promise<ListUsersResult>;
  save(user: User): Promise<User>;
}
