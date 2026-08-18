import { Inject, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetStatusHistory } from '../../domain/entities/asset-status-history.entity';
import { AssetTagGenerator } from '../../domain/services/asset-tag-generator';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssetBulkImportedEvent } from '../../domain/events/asset.events';
import { asyncContext } from '../../../../common/utils/async-context';
import { BulkImportRowDto } from './bulk-import-row.dto';

interface CsvRow {
  asset_tag?: string;
  device_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  imei?: string;
  purchase_date?: string;
  purchase_amount?: string;
  purchase_currency?: string;
  vendor?: string;
  warranty_expiry?: string;
  office_location?: string;
  department?: string;
  notes?: string;
}

export interface BulkImportCommand {
  csv: string;
  dryRun: boolean;
}

export interface BulkImportRowResult {
  row: number;
  status: 'ok' | 'error';
  assetTag?: string;
  message?: string;
}

export interface BulkImportResult {
  dryRun: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
}

/** undefined for a blank/absent cell, otherwise the trimmed string. */
const cell = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

/**
 * BulkImportAssetsUseCase — accepts a CSV blob, parses each row, and
 * either simulates (dryRun=true) or commits the write batch inside a
 * single logical operation. On error, individual rows are reported;
 * the whole operation still succeeds if partial success is possible
 * (this matches the "dry-run first, fix, then commit" flow from the
 * requirements analysis WF-11).
 *
 * dryRun never touches the repository's write/transaction path — rows
 * are only ever validated and checked against existing data. A commit
 * runs entirely inside one DB transaction (AssetRepository.withTransaction)
 * so a mid-batch failure leaves no partial writes.
 */
@Injectable()
export class BulkImportAssetsUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: BulkImportCommand): Promise<BulkImportResult> {
    const rows = parse(command.csv, {
      columns: (headers: string[]) =>
        headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as CsvRow[];

    const now = this.clock.now();
    const actor = asyncContext.get()?.userId ?? null;
    const year = now.getUTCFullYear();
    let nextSeq = (await this.assets.countAllForYear(year)) + 1;

    const seenTags = new Set<string>();
    const seenSns = new Set<string>();
    const seenImeis = new Set<string>();
    const toPersist: Asset[] = [];
    const history: AssetStatusHistory[] = [];
    const results: BulkImportRowResult[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2; // +1 for zero-based, +1 for header row

      const candidate = plainToInstance(BulkImportRowDto, {
        assetTag: cell(row.asset_tag)?.toUpperCase(),
        deviceType: cell(row.device_type),
        brand: cell(row.brand),
        model: cell(row.model),
        serialNumber: cell(row.serial_number),
        imei: cell(row.imei),
        purchaseDate: cell(row.purchase_date),
        purchaseAmount: cell(row.purchase_amount) ? Number(row.purchase_amount) : undefined,
        purchaseCurrency: cell(row.purchase_currency),
        vendor: cell(row.vendor),
        warrantyExpiry: cell(row.warranty_expiry),
        officeLocation: cell(row.office_location),
        department: cell(row.department),
        notes: cell(row.notes),
      });

      const violations = await validate(candidate, { whitelist: true });
      if (violations.length > 0) {
        results.push({
          row: rowNumber,
          status: 'error',
          message: violations
            .map((v) => Object.values(v.constraints ?? {}).join(', '))
            .join('; '),
        });
        continue;
      }

      let tag = candidate.assetTag ?? '';
      if (!tag) tag = AssetTagGenerator.build(year, nextSeq++);

      if (seenTags.has(tag)) {
        results.push({ row: rowNumber, status: 'error', message: `Duplicate asset tag in file: ${tag}` });
        continue;
      }
      if (await this.assets.findByTag(tag)) {
        results.push({ row: rowNumber, status: 'error', message: `Asset tag already in system: ${tag}` });
        continue;
      }
      seenTags.add(tag);

      const sn = candidate.serialNumber;
      if (seenSns.has(sn)) {
        results.push({ row: rowNumber, status: 'error', message: `Duplicate serial in file: ${sn}` });
        continue;
      }
      if (await this.assets.findBySerialNumber(sn)) {
        results.push({ row: rowNumber, status: 'error', message: `Serial already in system: ${sn}` });
        continue;
      }
      seenSns.add(sn);

      const imei = candidate.imei ?? null;
      if (imei) {
        if (seenImeis.has(imei)) {
          results.push({ row: rowNumber, status: 'error', message: `Duplicate IMEI in file: ${imei}` });
          continue;
        }
        if (await this.assets.findByImei(imei)) {
          results.push({ row: rowNumber, status: 'error', message: `IMEI already in system: ${imei}` });
          continue;
        }
        seenImeis.add(imei);
      }

      try {
        const asset = Asset.register({
          id: this.ids.next(),
          assetTag: tag,
          deviceType: candidate.deviceType,
          brand: candidate.brand,
          model: candidate.model,
          serialNumber: sn,
          imei,
          purchaseDate: candidate.purchaseDate ? new Date(candidate.purchaseDate) : null,
          purchaseAmountCents:
            candidate.purchaseAmount != null ? Math.round(candidate.purchaseAmount * 100) : null,
          purchaseCurrency: candidate.purchaseCurrency ?? 'USD',
          vendor: candidate.vendor ?? null,
          warrantyExpiry: candidate.warrantyExpiry ? new Date(candidate.warrantyExpiry) : null,
          officeLocation: candidate.officeLocation ?? null,
          department: candidate.department ?? null,
          notes: candidate.notes ?? null,
          now,
        });
        toPersist.push(asset);
        history.push(
          AssetStatusHistory.append({
            id: this.ids.next(),
            assetId: asset.id,
            fromStatus: null,
            toStatus: asset.status,
            changedByUserId: actor,
            reason: 'Bulk import',
            occurredAt: now,
          }),
        );
        results.push({ row: rowNumber, status: 'ok', assetTag: tag });
      } catch (err) {
        results.push({
          row: rowNumber,
          status: 'error',
          message: (err as Error).message,
        });
      }
    }

    if (!command.dryRun && toPersist.length > 0) {
      await this.assets.withTransaction(async (txAssets) => {
        await txAssets.saveMany(toPersist);
        for (const h of history) await txAssets.appendStatusHistory(h);
      });
      this.events.publish(
        new AssetBulkImportedEvent({
          count: toPersist.length,
          importedByUserId: actor,
        }),
      );
    }

    return {
      dryRun: command.dryRun,
      totalRows: rows.length,
      successCount: results.filter((r) => r.status === 'ok').length,
      errorCount: results.filter((r) => r.status === 'error').length,
      results,
    };
  }
}
