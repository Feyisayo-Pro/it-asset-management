import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { PermissionOrmEntity } from '../typeorm-entities/permission.orm-entity';

@Injectable()
export class TypeOrmPermissionRepository implements PermissionRepository {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly repo: Repository<PermissionOrmEntity>,
  ) {}

  async listKeysForRole(roleId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .innerJoin('role_permissions', 'rp', 'rp.permission_id = p.id')
      .where('rp.role_id = :roleId', { roleId })
      .select('p.key', 'key')
      .getRawMany<{ key: string }>();
    return rows.map((r) => r.key);
  }

  async listAllKeys(): Promise<string[]> {
    const rows = await this.repo.find({ select: { key: true } });
    return rows.map((r) => r.key);
  }
}
