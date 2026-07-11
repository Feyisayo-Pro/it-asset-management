import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';

export interface AssetDto {
  id: string;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  imei: string | null;
  purchaseDate: string | null;
  purchaseAmount: number | null;
  purchaseCurrency: string;
  vendor: string | null;
  warrantyExpiry: string | null;
  officeLocation: string | null;
  department: string | null;
  currentHolderId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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

export const toStatusHistoryDto = (h: AssetStatusHistory) => ({
  id: h.id,
  assetId: h.assetId,
  fromStatus: h.fromStatus,
  toStatus: h.toStatus,
  changedByUserId: h.changedByUserId,
  reason: h.reason,
  occurredAt: h.occurredAt.toISOString(),
});
