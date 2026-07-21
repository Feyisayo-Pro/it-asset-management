import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { AcquisitionOrmEntity } from './infrastructure/typeorm-entities/acquisition.orm-entity';
import { AssetOrmEntity } from '../asset/infrastructure/typeorm-entities/asset.orm-entity';
import { ApplicationError } from '../../common/errors/domain.error';

export class AcquisitionNotFoundError extends ApplicationError {
  readonly code = 'ACQUISITION_NOT_FOUND';
  constructor(id: string) {
    super('Acquisition not found', { id });
  }
}

export interface AcquisitionDto {
  id: string;
  vendorId: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
  purchaseDate: string | null;
  warrantyMonths: number | null;
  unitCostCents: number | null;
  currency: string;
  quantity: number;
  notes: string | null;
  createdBy: string | null;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
}

function toDto(e: AcquisitionOrmEntity): AcquisitionDto {
  return {
    id: e.id,
    vendorId: e.vendorId,
    vendorName: e.vendor?.name ?? null,
    invoiceNumber: e.invoiceNumber,
    purchaseDate: e.purchaseDate ? e.purchaseDate.toISOString().slice(0, 10) : null,
    warrantyMonths: e.warrantyMonths,
    unitCostCents: e.unitCostCents ? Number(e.unitCostCents) : null,
    currency: e.currency,
    quantity: e.quantity,
    notes: e.notes,
    createdBy: e.createdBy,
    assetIds: e.assets?.map((a) => a.id) ?? [],
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export interface ListAcquisitionsParams {
  page: number;
  pageSize: number;
  search?: string;
  vendorId?: string;
}

@Injectable()
export class AcquisitionService {
  constructor(
    @InjectRepository(AcquisitionOrmEntity)
    private readonly repo: Repository<AcquisitionOrmEntity>,
    @InjectRepository(AssetOrmEntity)
    private readonly assetRepo: Repository<AssetOrmEntity>,
  ) {}

  async list(params: ListAcquisitionsParams) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.vendor', 'v')
      .leftJoinAndSelect('a.assets', 'assets');

    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(a.invoice_number) LIKE :like', { like })
            .orWhere('LOWER(v.name) LIKE :like', { like })
            .orWhere('LOWER(a.notes) LIKE :like', { like });
        }),
      );
    }
    if (params.vendorId) {
      qb.andWhere('a.vendor_id = :vendorId', { vendorId: params.vendorId });
    }

    qb.orderBy('a.created_at', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), page, pageSize, total };
  }

  async getById(id: string): Promise<AcquisitionDto> {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['vendor', 'assets'],
    });
    if (!row) throw new AcquisitionNotFoundError(id);
    return toDto(row);
  }

  async create(
    input: {
      vendorId?: string | null;
      invoiceNumber?: string | null;
      purchaseDate?: string | null;
      warrantyMonths?: number | null;
      unitCostCents?: number | null;
      currency?: string;
      quantity?: number;
      notes?: string | null;
      assetIds?: string[];
    },
    createdBy: string,
  ): Promise<AcquisitionDto> {
    const entity = this.repo.create({
      vendorId: input.vendorId || null,
      invoiceNumber: input.invoiceNumber?.trim() || null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      warrantyMonths: input.warrantyMonths ?? null,
      unitCostCents: input.unitCostCents != null ? String(input.unitCostCents) : null,
      currency: input.currency?.toUpperCase() || 'USD',
      quantity: input.quantity ?? 1,
      notes: input.notes?.trim() || null,
      createdBy,
    });

    if (input.assetIds?.length) {
      entity.assets = await this.assetRepo.findBy({ id: In(input.assetIds) });
    }

    const saved = await this.repo.save(entity);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['vendor', 'assets'],
    });
    return toDto(full!);
  }

  async update(
    id: string,
    patch: {
      vendorId?: string | null;
      invoiceNumber?: string | null;
      purchaseDate?: string | null;
      warrantyMonths?: number | null;
      unitCostCents?: number | null;
      currency?: string;
      quantity?: number;
      notes?: string | null;
      assetIds?: string[];
    },
  ): Promise<AcquisitionDto> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['vendor', 'assets'],
    });
    if (!entity) throw new AcquisitionNotFoundError(id);

    if (patch.vendorId !== undefined) entity.vendorId = patch.vendorId || null;
    if (patch.invoiceNumber !== undefined)
      entity.invoiceNumber = patch.invoiceNumber?.trim() || null;
    if (patch.purchaseDate !== undefined)
      entity.purchaseDate = patch.purchaseDate ? new Date(patch.purchaseDate) : null;
    if (patch.warrantyMonths !== undefined)
      entity.warrantyMonths = patch.warrantyMonths ?? null;
    if (patch.unitCostCents !== undefined)
      entity.unitCostCents = patch.unitCostCents != null ? String(patch.unitCostCents) : null;
    if (patch.currency !== undefined)
      entity.currency = patch.currency?.toUpperCase() || 'USD';
    if (patch.quantity !== undefined) entity.quantity = patch.quantity ?? 1;
    if (patch.notes !== undefined) entity.notes = patch.notes?.trim() || null;
    if (patch.assetIds !== undefined) {
      entity.assets = patch.assetIds.length
        ? await this.assetRepo.findBy({ id: In(patch.assetIds) })
        : [];
    }

    await this.repo.save(entity);
    const full = await this.repo.findOne({
      where: { id },
      relations: ['vendor', 'assets'],
    });
    return toDto(full!);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
