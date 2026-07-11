import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatusHistory } from '../../../src/modules/asset/domain/entities/asset-status-history.entity';
import {
  AssetRepository,
  ListAssetsParams,
  ListAssetsResult,
} from '../../../src/modules/asset/domain/repositories/asset.repository';
import { BarcodeService } from '../../../src/modules/asset/application/ports/barcode.port';

export class FakeAssetRepository implements AssetRepository {
  public assets = new Map<string, Asset>();
  public history: AssetStatusHistory[] = [];

  async findById(id: string): Promise<Asset | null> {
    return this.assets.get(id) ?? null;
  }
  async findByTag(tag: string): Promise<Asset | null> {
    for (const a of this.assets.values()) if (a.assetTag === tag.toUpperCase()) return a;
    return null;
  }
  async findBySerialNumber(sn: string): Promise<Asset | null> {
    for (const a of this.assets.values()) if (a.serialNumber === sn) return a;
    return null;
  }
  async findByImei(imei: string): Promise<Asset | null> {
    for (const a of this.assets.values()) if (a.imei === imei) return a;
    return null;
  }
  async list(params: ListAssetsParams): Promise<ListAssetsResult> {
    let items = Array.from(this.assets.values());
    if (params.search) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (a) =>
          a.assetTag.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          (a.imei?.toLowerCase().includes(q) ?? false) ||
          a.model.toLowerCase().includes(q) ||
          a.brand.toLowerCase().includes(q),
      );
    }
    if (params.status) items = items.filter((a) => a.status === params.status);
    if (params.deviceType) items = items.filter((a) => a.deviceType === params.deviceType);
    if (params.brand) items = items.filter((a) => a.brand === params.brand);
    if (params.department) items = items.filter((a) => a.department === params.department);
    if (params.currentHolderId) {
      items = items.filter((a) => a.currentHolderId === params.currentHolderId);
    }
    const total = items.length;
    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    return {
      data: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
    };
  }
  async save(asset: Asset): Promise<Asset> {
    this.assets.set(asset.id, asset);
    return asset;
  }
  async saveMany(assets: Asset[]): Promise<Asset[]> {
    for (const a of assets) this.assets.set(a.id, a);
    return assets;
  }
  async delete(id: string): Promise<void> {
    this.assets.delete(id);
  }
  async appendStatusHistory(entry: AssetStatusHistory): Promise<void> {
    this.history.push(entry);
  }
  async listStatusHistory(assetId: string): Promise<AssetStatusHistory[]> {
    return this.history.filter((h) => h.assetId === assetId);
  }
  async countAllForYear(year: number): Promise<number> {
    let n = 0;
    for (const a of this.assets.values()) if (a.createdAt.getUTCFullYear() === year) n += 1;
    return n;
  }
}

export class FakeBarcodeService implements BarcodeService {
  async qrPngBase64(payload: string): Promise<string> { return `qr:${payload}`; }
  async qrPngBuffer(payload: string): Promise<Buffer> { return Buffer.from(payload); }
  async barcodePngBase64(payload: string): Promise<string> { return `bc:${payload}`; }
  async barcodePngBuffer(payload: string): Promise<Buffer> { return Buffer.from(payload); }
}
