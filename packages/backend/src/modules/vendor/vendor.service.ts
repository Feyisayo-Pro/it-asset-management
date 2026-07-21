import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { VendorOrmEntity } from './infrastructure/typeorm-entities/vendor.orm-entity';
import { ApplicationError } from '../../common/errors/domain.error';

export interface VendorDto {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class VendorNotFoundError extends ApplicationError {
  readonly code = 'VENDOR_NOT_FOUND';
  constructor(id: string) {
    super('Vendor not found', { id });
  }
}

function toDto(v: VendorOrmEntity): VendorDto {
  return {
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson,
    email: v.email,
    phone: v.phone,
    taxId: v.taxId,
    address: v.address,
    website: v.website,
    notes: v.notes,
    isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export interface ListVendorsParams {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(VendorOrmEntity)
    private readonly repo: Repository<VendorOrmEntity>,
  ) {}

  async list(params: ListVendorsParams) {
    const qb = this.repo.createQueryBuilder('v');

    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(v.name) LIKE :like', { like })
            .orWhere('LOWER(v.contact_person) LIKE :like', { like })
            .orWhere('LOWER(v.email) LIKE :like', { like });
        }),
      );
    }
    if (params.isActive !== undefined) {
      qb.andWhere('v.is_active = :active', { active: params.isActive });
    }

    qb.orderBy('v.name', 'ASC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), page, pageSize, total };
  }

  async getById(id: string): Promise<VendorDto> {
    const row = await this.repo.findOneBy({ id });
    if (!row) throw new VendorNotFoundError(id);
    return toDto(row);
  }

  async create(input: {
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    taxId?: string | null;
    address?: string | null;
    website?: string | null;
    notes?: string | null;
  }): Promise<VendorDto> {
    const entity = this.repo.create({
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      taxId: input.taxId?.trim() || null,
      address: input.address?.trim() || null,
      website: input.website?.trim() || null,
      notes: input.notes?.trim() || null,
    });
    const saved = await this.repo.save(entity);
    return toDto(saved);
  }

  async update(
    id: string,
    patch: {
      name?: string;
      contactPerson?: string | null;
      email?: string | null;
      phone?: string | null;
      taxId?: string | null;
      address?: string | null;
      website?: string | null;
      notes?: string | null;
      isActive?: boolean;
    },
  ): Promise<VendorDto> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new VendorNotFoundError(id);
    if (patch.name !== undefined) entity.name = patch.name.trim();
    if (patch.contactPerson !== undefined) entity.contactPerson = patch.contactPerson?.trim() || null;
    if (patch.email !== undefined) entity.email = patch.email?.trim() || null;
    if (patch.phone !== undefined) entity.phone = patch.phone?.trim() || null;
    if (patch.taxId !== undefined) entity.taxId = patch.taxId?.trim() || null;
    if (patch.address !== undefined) entity.address = patch.address?.trim() || null;
    if (patch.website !== undefined) entity.website = patch.website?.trim() || null;
    if (patch.notes !== undefined) entity.notes = patch.notes?.trim() || null;
    if (patch.isActive !== undefined) entity.isActive = patch.isActive;
    const saved = await this.repo.save(entity);
    return toDto(saved);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
