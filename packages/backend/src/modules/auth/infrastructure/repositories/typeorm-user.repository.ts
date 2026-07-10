import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserProps } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
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

  async save(user: User): Promise<User> {
    const props = user.toPersistence();
    await this.repo.upsert(this.toRow(props), ['id']);
    return user;
  }

  private toDomain(row: UserOrmEntity): User {
    return User.hydrate({
      id: row.id,
      email: row.email,
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
