import 'reflect-metadata';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { v5 as uuidv5 } from 'uuid';
import AppDataSource from '../../config/data-source';
import { Asset } from '../../modules/asset/domain/entities/asset.entity';
import { AssetStatusHistory } from '../../modules/asset/domain/entities/asset-status-history.entity';
import { AssetStatus } from '../../modules/asset/domain/value-objects/asset-status';
import { AssetTagGenerator } from '../../modules/asset/domain/services/asset-tag-generator';
import { TypeOrmAssetRepository } from '../../modules/asset/infrastructure/repositories/typeorm-asset.repository';
import { AssetOrmEntity } from '../../modules/asset/infrastructure/typeorm-entities/asset.orm-entity';
import { AssetStatusHistoryOrmEntity } from '../../modules/asset/infrastructure/typeorm-entities/asset-status-history.orm-entity';
import {
  ParsedInventoryRow,
  isParseFailure,
  parseLaptopRow,
  parsePhoneRow,
} from './lib/inventory-xlsx-parser';

/**
 * seed-full-inventory — parses and seeds the REAL full Sapphire
 * Virtual baseline inventory export (~136 laptops + ~73 phones), not
 * a sample. Source: docs/22-sapphire-virtual-source-data.md.
 *
 * The source file is a real-world spreadsheet with inconsistent,
 * free-text data entry (status values like "CURRENTLY WITH TOYE" or
 * "YET TO BE RETURNED TO US BY ELIJAH", serial numbers embedded in
 * half a dozen delimiter styles). See lib/inventory-xlsx-parser.ts for
 * the parsing heuristics and their documented fallbacks. Every
 * imported asset's `notes` field records the exact raw source fields
 * it was derived from, and any row where a heuristic had to guess is
 * flagged with a warning printed by this script — nothing is silently
 * misrepresented as clean data.
 *
 * Idempotent: each row's asset id is deterministic (uuid v5, derived
 * from the sheet name + the source file's own "S/N" row number, not
 * from parsed content — stable even if the parsing heuristics
 * improve later). The live path checks findById before writing
 * anything for a row, for the same reason as seed-initial-inventory.ts
 * (superseded by this script — see CLAUDE.md): asset_status_history
 * is insert-only, so re-running a naive upsert crashes on the second
 * run.
 *
 * Usage:
 *   npm run seed:inventory:full              # writes to the configured DB
 *   npm run seed:inventory:full:dry-run       # validates + prints, no writes
 *
 * The source workbook path defaults to the copy checked into this
 * repo (source-data/); override with INVENTORY_XLSX_PATH if seeding
 * from an updated export.
 */

const DEFAULT_XLSX_PATH = path.join(
  __dirname,
  'source-data',
  'phone-and-laptop-update-2026-07-14.xlsx',
);

// Any fixed UUID works as a uuidv5 namespace; this one is arbitrary
// and specific to this seed script.
const ID_NAMESPACE = 'b8f2a6b0-6f2b-4c1e-9b8b-4a1a9b6e3f11';

const deterministicId = (sheet: 'laptop' | 'phone', sheetRowNumber: number): string =>
  uuidv5(`${sheet}-row:${sheetRowNumber}`, ID_NAMESPACE);

const historyId = (assetId: string, stage: number): string =>
  uuidv5(`${assetId}:history:${stage}`, ID_NAMESPACE);

interface BuiltRecord {
  asset: Asset;
  history: AssetStatusHistory[];
  parsed: ParsedInventoryRow;
}

function buildRecord(
  parsed: ParsedInventoryRow,
  sheet: 'laptop' | 'phone',
  assetTag: string,
  now: Date,
): BuiltRecord {
  const id = deterministicId(sheet, parsed.sourceSheetRowNumber);
  const asset = Asset.register({
    id,
    assetTag,
    deviceType: parsed.deviceType,
    brand: parsed.brand,
    model: parsed.model,
    serialNumber: parsed.serialNumber,
    imei: parsed.imei,
    department: parsed.department,
    notes: parsed.notes,
    now,
  });

  const history: AssetStatusHistory[] = [];
  let stage = 0;
  const push = (fromStatus: AssetStatus | null, toStatus: AssetStatus) => {
    stage += 1;
    history.push(
      AssetStatusHistory.append({
        id: historyId(id, stage),
        assetId: id,
        fromStatus,
        toStatus,
        changedByUserId: null,
        reason: 'Full baseline inventory import',
        occurredAt: now,
      }),
    );
  };
  push(null, asset.status); // Registration

  // Walk the real state machine to the source-derived target status,
  // never skip straight there — matches every other write path in
  // this codebase (see CLAUDE.md "Lifecycle State Machine").
  const transitions: AssetStatus[] =
    parsed.status === AssetStatus.Registration
      ? []
      : parsed.status === AssetStatus.Available
        ? [AssetStatus.Available]
        : [AssetStatus.Available, parsed.status];

  let from = asset.status;
  for (const to of transitions) {
    if (to === from) continue;
    asset.changeStatus(to, now);
    push(from, to);
    from = to;
  }

  return { asset, history, parsed };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const xlsxPath = process.env.INVENTORY_XLSX_PATH ?? DEFAULT_XLSX_PATH;
  const now = new Date();
  const year = now.getUTCFullYear();

  const wb = XLSX.readFile(xlsxPath);
  const laptopSheet = wb.Sheets['LAPTOPS'];
  const phoneSheet = wb.Sheets['PHONES'];
  if (!laptopSheet || !phoneSheet) {
    throw new Error(
      `Expected "LAPTOPS" and "PHONES" sheets in ${xlsxPath}, found: ${wb.SheetNames.join(', ')}`,
    );
  }

  const laptopRows = (XLSX.utils.sheet_to_json(laptopSheet, { header: 1, defval: null }) as unknown[][]).slice(1);
  const phoneRows = (XLSX.utils.sheet_to_json(phoneSheet, { header: 1, defval: null }) as unknown[][]).slice(1);

  console.log(`Read ${laptopRows.length} laptop row(s) and ${phoneRows.length} phone row(s) from ${xlsxPath}`);

  const parsed: ParsedInventoryRow[] = [];
  const failures: string[] = [];
  const warnings: string[] = [];

  laptopRows.forEach((row, i) => {
    const result = parseLaptopRow(row, i + 2); // +1 header, +1 to make it 1-based
    if (isParseFailure(result)) {
      failures.push(`LAPTOPS row ${result.sourceRow}: ${result.reason}`);
      return;
    }
    result.warnings.forEach((w) => warnings.push(`LAPTOPS row ${result.sourceRow}: ${w}`));
    parsed.push(result);
  });
  phoneRows.forEach((row, i) => {
    const result = parsePhoneRow(row, i + 2);
    if (isParseFailure(result)) {
      failures.push(`PHONES row ${result.sourceRow}: ${result.reason}`);
      return;
    }
    result.warnings.forEach((w) => warnings.push(`PHONES row ${result.sourceRow}: ${w}`));
    parsed.push(result);
  });

  // Resolve any duplicate serials/tags *within this batch* before ever
  // touching the DB — a low-confidence fallback serial (the raw
  // MODEL/SERIAL text, when nothing structured could be extracted)
  // could theoretically collide between two rows. Disambiguate by
  // suffixing the source row number, which is always unique.
  const seenSerials = new Map<string, number>();
  for (const rec of parsed) {
    const count = (seenSerials.get(rec.serialNumber) ?? 0) + 1;
    seenSerials.set(rec.serialNumber, count);
    if (count > 1) {
      const disambiguated = `${rec.serialNumber}-R${rec.sourceRow}`;
      warnings.push(
        `serialNumber "${rec.serialNumber}" collided across rows (source row ${rec.sourceRow}) — disambiguated to "${disambiguated}"`,
      );
      rec.serialNumber = disambiguated;
    }
  }

  if (failures.length > 0) {
    console.log(`\n${failures.length} row(s) could not be parsed at all and will be skipped:`);
    failures.forEach((f) => console.log(`  SKIP: ${f}`));
  }
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s) — row(s) imported, but a heuristic had to guess:`);
    warnings.forEach((w) => console.log(`  WARN: ${w}`));
  }

  const buildAll = (startSeq: number): BuiltRecord[] => {
    let nextSeq = startSeq;
    return parsed.map((rec) => {
      const sheet: 'laptop' | 'phone' = rec.deviceType === 'Laptop' ? 'laptop' : 'phone';
      const assetTag = AssetTagGenerator.build(year, nextSeq);
      nextSeq += 1;
      return buildRecord(rec, sheet, assetTag, now);
    });
  };

  const logSummary = (built: BuiltRecord[]) => {
    const byDeviceType = (t: 'Laptop' | 'Phone') => built.filter((b) => b.parsed.deviceType === t).length;
    console.log(
      `\n${dryRun ? '[DRY RUN] ' : ''}Prepared ${built.length} asset(s): ${byDeviceType('Laptop')} laptop(s), ${byDeviceType('Phone')} phone(s).`,
    );
    const byStatus = new Map<string, number>();
    for (const b of built) byStatus.set(b.asset.status, (byStatus.get(b.asset.status) ?? 0) + 1);
    for (const [status, count] of byStatus) console.log(`  ${status}: ${count}`);
  };

  if (dryRun) {
    logSummary(buildAll(1));
    console.log('[DRY RUN] No database writes performed.');
    return;
  }

  await AppDataSource.initialize();
  try {
    const assetRepo = new TypeOrmAssetRepository(
      AppDataSource.getRepository(AssetOrmEntity),
      AppDataSource.getRepository(AssetStatusHistoryOrmEntity),
    );

    const startSeq = (await assetRepo.countAllForYear(year)) + 1;
    const built = buildAll(startSeq);
    logSummary(built);

    let seeded = 0;
    let skipped = 0;
    for (const { asset, history } of built) {
      // Same reasoning as seed-initial-inventory.ts: asset_status_history
      // is insert-only, so an already-seeded record must be skipped
      // entirely, not upserted.
      if (await assetRepo.findById(asset.id)) {
        skipped += 1;
        continue;
      }
      await assetRepo.save(asset);
      for (const h of history) await assetRepo.appendStatusHistory(h);
      seeded += 1;
    }
    console.log(`\nSeeded ${seeded} new asset(s), skipped ${skipped} already-seeded.`);
    console.log(`Total rows in source: ${laptopRows.length + phoneRows.length}; parsed: ${built.length}; unparseable: ${failures.length}.`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('seed-full-inventory failed:', err);
  process.exitCode = 1;
});
