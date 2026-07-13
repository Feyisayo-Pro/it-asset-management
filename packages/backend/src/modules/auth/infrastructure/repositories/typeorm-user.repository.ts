import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User, UserProps } from '../../domain/entities/user.entity';
import {
  ListUsersParams,
  ListUsersResult,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { UserOrmEntity } from '../typeorm-entities/user.orm-entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOne({
      where: { email: email.toLowerCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async countAll(): Promise<number> {
    return this.repo.count();
  }

  async countActiveByRole(roleId: string): Promise<number> {
    return this.repo.count({ where: { roleId, isActive: true } });
  }

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const qb = this.repo.createQueryBuilder('u');

    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(u.email) LIKE :like', { like })
            .orWhere('LOWER(u.first_name) LIKE :like', { like })
            .orWhere('LOWER(u.last_name) LIKE :like', { like });
        }),
      );
    }
    if (params.roleId) qb.andWhere('u.role_id = :roleId', { roleId: params.roleId });
    if (params.isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: params.isActive });
    }

    const sortMap: Record<NonNullable<ListUsersParams['sort']>['field'], string> = {
      lastName: 'u.last_name',
      email: 'u.email',
      lastLoginAt: 'u.last_login_at',
      createdAt: 'u.created_at',
    };
    const sortField = params.sort ? sortMap[params.sort.field] : 'u.last_name';
    const sortDir: 'ASC' | 'DESC' =
      params.sort?.direction === 'desc' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortDir);

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.toDomain(row)),
      page,
      pageSize,
      total,
    };
  }

  async save(user: User): Promise<User> {
    const props = user.toPersistence();
    await this.repo.upsert(this.toRow(props), ['id']);
    return user;
  }

  private toDomain(row: UserOrmEntity): User {
    return User.hydrate({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: row.passwordHash,
      roleId: row.roleId,
      isActive: row.isActive,
      failedLoginAttempts: row.failedLoginAttempts,
      lockedUntil: row.lockedUntil,
      lastLoginAt: row.lastLoginAt,
      mustChangePassword: row.mustChangePassword,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(props: UserProps): UserOrmEntity {
    const row = new UserOrmEntity();
    row.id = props.id;
    row.email = props.email;
    row.firstName = props.firstName;
    row.lastName = props.lastName;
    row.passwordHash = props.passwordHash;
    row.roleId = props.roleId;
    row.isActive = props.isActive;
    row.failedLoginAttempts = props.failedLoginAttempts;
    row.lockedUntil = props.lockedUntil;
    row.lastLoginAt = props.lastLoginAt;
    row.mustChangePassword = props.mustChangePassword;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    return row;
  }
}

