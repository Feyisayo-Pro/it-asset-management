import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import {
  ASSET_REPOSITORY,
  AssetRepository,
  ListAssetsParams,
} from '../../domain/repositories/asset.repository';

@Injectable()
export class ExportAssetsUseCase {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository) {}

  async toCsv(filters: Omit<ListAssetsParams, 'page' | 'pageSize'>): Promise<string> {
    // Chunked read so large inventories don't hit the max page size.
    const CHUNK = 500;
    let page = 1;
    const rows: Array<Record<string, unknown>> = [];
    while (true) {
      const result = await this.assets.list({
        ...filters,
        page,
        pageSize: CHUNK,
      });
      for (const a of result.data) {
        rows.push({
          asset_tag: a.assetTag,
          device_type: a.deviceType,
          brand: a.brand,
          model: a.model,
          serial_number: a.serialNumber,
          imei: a.imei ?? '',
          status: a.status,
          purchase_date: a.purchaseDate ? (a.purchaseDate instanceof Date ? a.purchaseDate.toISOString().slice(0, 10) : String(a.purchaseDate).slice(0, 10)) : '',
          purchase_amount:
            a.purchaseAmountCents != null ? (a.purchaseAmountCents / 100).toFixed(2) : '',
          purchase_currency: a.purchaseCurrency,
          vendor: a.vendor ?? '',
          warranty_expiry: a.warrantyExpiry
            ? (a.warrantyExpiry instanceof Date ? a.warrantyExpiry.toISOString().slice(0, 10) : String(a.warrantyExpiry).slice(0, 10))
            : '',
          office_location: a.officeLocation ?? '',
          department: a.department ?? '',
          current_holder_id: a.currentHolderId ?? '',
          notes: a.notes ?? '',
        });
      }
      if (rows.length >= result.total || result.data.length < CHUNK) break;
      page += 1;
    }
    return stringify(rows, {
      header: true,
      columns: [
        'asset_tag',
        'device_type',
        'brand',
        'model',
        'serial_number',
        'imei',
        'status',
        'purchase_date',
        'purchase_amount',
        'purchase_currency',
        'vendor',
        'warranty_expiry',
        'office_location',
        'department',
        'current_holder_id',
        'notes',
      ],
    });
  }
}
