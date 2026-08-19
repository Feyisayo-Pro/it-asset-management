import { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import {
  ASSET_REPOSITORY,
  AssetRepository,
  ListAssetsParams,
} from '../../domain/repositories/asset.repository';

const COLUMNS = [
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
  'assigned_employee_name',
  'current_holder_id',
  'notes',
];

@Injectable()
export class ExportAssetsUseCase {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository) {}

  /**
   * Streams matching assets straight from the DB through a CSV
   * transform, row by row — nothing accumulates in process memory, so
   * this scales to inventories far larger than would fit in a single
   * response buffer.
   */
  async streamCsv(filters: Omit<ListAssetsParams, 'page' | 'pageSize'>): Promise<Readable> {
    const rows = await this.assets.streamForExport(filters);
    const csv = stringify({ header: true, columns: COLUMNS });
    return rows.pipe(csv);
  }
}
