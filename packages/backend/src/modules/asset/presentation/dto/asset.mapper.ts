import { ApiProperty } from '@nestjs/swagger';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import { ALL_ASSET_STATUSES, AssetStatus } from '../../domain/value-objects/asset-status';

export class AssetDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'AST-2026-00042' }) assetTag!: string;
  @ApiProperty({ example: 'Laptop' }) deviceType!: string;
  @ApiProperty({ example: 'Dell' }) brand!: string;
  @ApiProperty({ example: 'Latitude 5440' }) model!: string;
  @ApiProperty({ example: 'SN-8842091' }) serialNumber!: string;
  @ApiProperty({ nullable: true, example: '351756051523999' }) imei!: string | null;
  @ApiProperty({ nullable: true, example: '2026-01-15' }) purchaseDate!: string | null;
  @ApiProperty({ nullable: true, example: 1200.0 }) purchaseAmount!: number | null;
  @ApiProperty({ example: 'USD' }) purchaseCurrency!: string;
  @ApiProperty({ nullable: true, example: 'Acme Direct' }) vendor!: string | null;
  @ApiProperty({ nullable: true, example: '2028-01-15' }) warrantyExpiry!: string | null;
  @ApiProperty({ nullable: true, example: 'HQ - Lagos' }) officeLocation!: string | null;
  @ApiProperty({ nullable: true, example: 'Engineering' }) department!: string | null;
  @ApiProperty({ nullable: true }) currentHolderId!: string | null;
  @ApiProperty({ enum: ALL_ASSET_STATUSES }) status!: AssetStatus;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class AssetStatusHistoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() assetId!: string;
  @ApiProperty({ enum: ALL_ASSET_STATUSES, nullable: true }) fromStatus!: AssetStatus | null;
  @ApiProperty({ enum: ALL_ASSET_STATUSES }) toStatus!: AssetStatus;
  @ApiProperty({ nullable: true }) changedByUserId!: string | null;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty() occurredAt!: string;
}

export class PagedAssetsDto {
  @ApiProperty({ type: [AssetDto] }) data!: AssetDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}

export const toAssetDto = (a: Asset): AssetDto => ({
  id: a.id,
  assetTag: a.assetTag,
  deviceType: a.deviceType,
  brand: a.brand,
  model: a.model,
  serialNumber: a.serialNumber,
  imei: a.imei,
  purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().slice(0, 10) : null,
  purchaseAmount: a.purchaseAmountCents != null ? a.purchaseAmountCents / 100 : null,
  purchaseCurrency: a.purchaseCurrency,
  vendor: a.vendor,
  warrantyExpiry: a.warrantyExpiry
    ? a.warrantyExpiry.toISOString().slice(0, 10)
    : null,
  officeLocation: a.officeLocation,
  department: a.department,
  currentHolderId: a.currentHolderId,
  status: a.status,
  notes: a.notes,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
});

export const toStatusHistoryDto = (h: AssetStatusHistory): AssetStatusHistoryDto => ({
  id: h.id,
  assetId: h.assetId,
  fromStatus: h.fromStatus,
  toStatus: h.toStatus,
  changedByUserId: h.changedByUserId,
  reason: h.reason,
  occurredAt: h.occurredAt.toISOString(),
});
