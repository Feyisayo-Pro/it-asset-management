import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';

const toDateStr = (v: Date | string): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

const toIso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

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
  purchaseDate: a.purchaseDate ? toDateStr(a.purchaseDate) : null,
  purchaseAmount: a.purchaseAmountCents != null ? a.purchaseAmountCents / 100 : null,
  purchaseCurrency: a.purchaseCurrency,
  vendor: a.vendor,
  warrantyExpiry: a.warrantyExpiry
    ? toDateStr(a.warrantyExpiry)
    : null,
  officeLocation: a.officeLocation,
  department: a.department,
  currentHolderId: a.currentHolderId,
  status: a.status,
  notes: a.notes,
  createdAt: toIso(a.createdAt),
  updatedAt: toIso(a.updatedAt),
});

export const toStatusHistoryDto = (h: AssetStatusHistory) => ({
  id: h.id,
  assetId: h.assetId,
  fromStatus: h.fromStatus,
  toStatus: h.toStatus,
  changedByUserId: h.changedByUserId,
  reason: h.reason,
  occurredAt: toIso(h.occurredAt),
});
