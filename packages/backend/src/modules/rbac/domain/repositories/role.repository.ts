import { Role } from '../entities/role.entity';
import { RoleName } from '../enums/role-name.enum';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: RoleName): Promise<Role | null>;
  listAll(): Promise<Role[]>;
}
