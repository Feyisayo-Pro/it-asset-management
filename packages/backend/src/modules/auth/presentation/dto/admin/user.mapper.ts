import { User } from '../../../domain/entities/user.entity';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toAdminUserDto = (user: User): AdminUserDto => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  roleId: user.roleId,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
