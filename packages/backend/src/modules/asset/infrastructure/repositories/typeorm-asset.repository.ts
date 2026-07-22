import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Asset, AssetProps } from '../../domain/entities/asset.entity';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import {
  AssetRepository,
  ListAssetsParams,
  ListAssetsResult,
} from '../../domain/repositories/asset.repository';
import { AssetOrmEntity } from '../typeorm-entities/asset.orm-entity';
import { AssetStatusHistoryOrmEntity } from '../typeorm-entities/asset-status-history.orm-entity';
import { AssetStatus } from '../../domain/value-objects/asset-status';

@Injectable()
export class TypeOrmAssetRepository implements AssetRepository {
  constructor(
    @InjectRepository(AssetOrmEntity)
    private readonly repo: Repository<AssetOrmEntity>,
    @InjectRepository(AssetStatusHistoryOrmEntity)
    private readonly historyRepo: Repository<AssetStatusHistoryOrmEntity>,
  ) {}

  async findById(id: string): Promise<Asset | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTag(tag: string): Promise<Asset | null> {
    const row = await this.repo.findOne({
      where: { assetTag: tag.trim().toUpperCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findBySerialNumber(sn: string): Promise<Asset | null> {
    const row = await this.repo.findOne({ where: { serialNumber: sn.trim() } });
    return row ? this.toDomain(row) : null;
  }

  async findByImei(imei: string): Promise<Asset | null> {
    const row = await this.repo.findOne({ where: { imei: imei.trim() } });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListAssetsParams): Promise<ListAssetsResult> {
    const qb = this.repo.createQueryBuilder('a');
    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(a.asset_tag) LIKE :like', { like })
            .orWhere('LOWER(a.serial_number) LIKE :like', { like })
            .orWhere('LOWER(a.imei) LIKE :like', { like })
            .orWhere('LOWER(a.model) LIKE :like', { like })
            .orWhere('LOWER(a.brand) LIKE :like', { like });
        }),
      );
    }
    if (params.status) qb.andWhere('a.status = :status', { status: params.status });
    if (params.deviceType) qb.andWhere('a.device_type = :dt', { dt: params.deviceType });
    if (params.brand) qb.andWhere('a.brand = :brand', { brand: params.brand });
    if (params.department) qb.andWhere('a.department = :dep', { dep: params.department });
    if (params.currentHolderId) {
      qb.andWhere('a.current_holder_id = :ch', { ch: params.currentHolderId });
    }

    const sortMap: Record<NonNullable<ListAssetsParams['sort']>['field'], string> = {
      assetTag: 'a.asset_tag',
      serialNumber: 'a.serial_number',
      status: 'a.status',
      createdAt: 'a.created_at',
    };
    const sortField = params.sort ? sortMap[params.sort.field] : 'a.created_at';
    const sortDir: 'ASC' | 'DESC' = params.sort?.direction === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(sortField, sortDir);

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) => this.toDomain(r)),
      page,
      pageSize,
      total,
    };
  }

  async save(asset: Asset): Promise<Asset> {
    await this.repo.upsert(this.toRow(asset.toPersistence()), ['id']);
    return asset;
  }

  async saveMany(assets: Asset[]): Promise<Asset[]> {
    if (assets.length === 0) return assets;
    await this.repo.upsert(
      assets.map((a) => this.toRow(a.toPersistence())),
      ['id'],
    );
    return assets;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async appendStatusHistory(entry: AssetStatusHistory): Promise<void> {
    const props = entry.toPersistence();
    const row = new AssetStatusHistoryOrmEntity();
    row.id = props.id;
    row.assetId = props.assetId;
    row.fromStatus = props.fromStatus;
    row.toStatus = props.toStatus;
    row.changedByUserId = props.changedByUserId;
    row.reason = props.reason;
    row.occurredAt = props.occurredAt;
    await this.historyRepo.insert(row);
  }

  async listStatusHistory(assetId: string): Promise<AssetStatusHistory[]> {
    const rows = await this.historyRepo.find({
      where: { assetId },
      order: { occurredAt: 'DESC' },
    });
    return rows.map((r) =>
      AssetStatusHistory.hydrate({
        id: r.id,
        assetId: r.assetId,
        fromStatus: (r.fromStatus as AssetStatus | null) ?? null,
        toStatus: r.toStatus as AssetStatus,
        changedByUserId: r.changedByUserId,
        reason: r.reason,
        occurredAt: r.occurredAt,
      }),
    );
  }

  async countAllForYear(year: number): Promise<number> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    return this.repo
      .createQueryBuilder('a')
      .where('a.created_at >= :start AND a.created_at < :end', { start, end })
      .getCount();
  }

  private toDomain(row: AssetOrmEntity): Asset {
    return Asset.hydrate({
      id: row.id,
      assetTag: row.assetTag,
      deviceType: row.deviceType,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serialNumber,
      imei: row.imei,
      purchaseDate: row.purchaseDate == null ? null : row.purchaseDate instanceof Date ? row.purchaseDate : new Date(row.purchaseDate),
      purchaseAmountCents:
        row.purchaseAmountCents === null ? null : Number(row.purchaseAmountCents),
      purchaseCurrency: row.purchaseCurrency,
      vendor: row.vendor,
      warrantyExpiry: row.warrantyExpiry == null ? null : row.warrantyExpiry instanceof Date ? row.warrantyExpiry : new Date(row.warrantyExpiry),
      officeLocation: row.officeLocation,
      department: row.department,
      currentHolderId: row.currentHolderId,
      status: row.status as AssetStatus,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(props: AssetProps): AssetOrmEntity {
    const row = new AssetOrmEntity();
    row.id = props.id;
    row.assetTag = props.assetTag;
    row.deviceType = props.deviceType;
    row.brand = props.brand;
    row.model = props.model;
    row.serialNumber = props.serialNumber;
    row.imei = props.imei;
    row.purchaseDate = props.purchaseDate;
    row.purchaseAmountCents =
      props.purchaseAmountCents === null ? null : String(props.purchaseAmountCents);
    row.purchaseCurrency = props.purchaseCurrency;
    row.vendor = props.vendor;
    row.warrantyExpiry = props.warrantyExpiry;
    row.officeLocation = props.officeLocation;
    row.department = props.department;
    row.currentHolderId = props.currentHolderId;
    row.status = props.status;
    row.notes = props.notes;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    return row;
  }
}
