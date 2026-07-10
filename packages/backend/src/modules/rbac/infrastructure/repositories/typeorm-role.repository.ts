import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../domain/entities/role.entity';
import { RoleName } from '../../domain/enums/role-name.enum';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { RoleOrmEntity } from '../typeorm-entities/role.orm-entity';

@Injectable()
export class TypeOrmRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly repo: Repository<RoleOrmEntity>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: RoleName): Promise<Role | null> {
    const row = await this.repo.findOne({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async listAll(): Promise<Role[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: RoleOrmEntity): Role {
    return new Role(row.id, row.name as RoleName, row.description);
  }
}
