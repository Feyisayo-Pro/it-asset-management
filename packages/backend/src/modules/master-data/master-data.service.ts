import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DepartmentOrmEntity,
  OfficeOrmEntity,
  DeviceTypeOrmEntity,
  BrandOrmEntity,
} from './infrastructure/typeorm-entities/master-data.orm-entity';

export interface MasterDataItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type MasterDataEntity =
  | DepartmentOrmEntity
  | OfficeOrmEntity
  | DeviceTypeOrmEntity
  | BrandOrmEntity;

function toDto(entity: MasterDataEntity): MasterDataItem {
  return {
    id: entity.id,
    name: entity.name,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

@Injectable()
export class MasterDataService {
  private readonly repos: Record<string, Repository<MasterDataEntity>>;

  constructor(
    @InjectRepository(DepartmentOrmEntity) departments: Repository<DepartmentOrmEntity>,
    @InjectRepository(OfficeOrmEntity) offices: Repository<OfficeOrmEntity>,
    @InjectRepository(DeviceTypeOrmEntity) deviceTypes: Repository<DeviceTypeOrmEntity>,
    @InjectRepository(BrandOrmEntity) brands: Repository<BrandOrmEntity>,
  ) {
    this.repos = {
      departments: departments as Repository<MasterDataEntity>,
      offices: offices as Repository<MasterDataEntity>,
      'device-types': deviceTypes as Repository<MasterDataEntity>,
      brands: brands as Repository<MasterDataEntity>,
    };
  }

  private getRepo(category: string): Repository<MasterDataEntity> {
    const repo = this.repos[category];
    if (!repo) throw new Error(`Unknown master data category: ${category}`);
    return repo;
  }

  async list(category: string, includeInactive = false): Promise<MasterDataItem[]> {
    const repo = this.getRepo(category);
    const where = includeInactive ? {} : { isActive: true };
    const rows = await repo.find({ where, order: { name: 'ASC' } });
    return rows.map(toDto);
  }

  async create(category: string, name: string): Promise<MasterDataItem> {
    const repo = this.getRepo(category);
    const entity = repo.create({ name: name.trim() });
    const saved = await repo.save(entity);
    return toDto(saved);
  }

  async update(category: string, id: string, patch: { name?: string; isActive?: boolean }): Promise<MasterDataItem> {
    const repo = this.getRepo(category);
    const entity = await repo.findOneByOrFail({ id });
    if (patch.name !== undefined) entity.name = patch.name.trim();
    if (patch.isActive !== undefined) entity.isActive = patch.isActive;
    const saved = await repo.save(entity);
    return toDto(saved);
  }

  async remove(category: string, id: string): Promise<void> {
    const repo = this.getRepo(category);
    await repo.delete({ id });
  }
}
