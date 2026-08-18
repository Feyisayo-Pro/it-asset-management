import { AssetStatus } from '../../../modules/asset/domain/value-objects/asset-status';

/**
 * Pure parsing helpers for the real Sapphire Virtual baseline
 * inventory export (docs/22-sapphire-virtual-source-data.md) —
 * "PHONE AND LAPTOP UPDATE AS AT JULY 14TH 2026.xlsx", LAPTOPS and
 * PHONES sheets. No I/O here — seed-full-inventory.ts owns reading
 * the file and writing to the DB; this module only turns raw row
 * arrays into structured, best-effort-parsed records plus a
 * human-readable list of assumptions made per row, so nothing is
 * silently guessed without a trace.
 *
 * The source data is real-world messy (free-text "status" values like
 * "CURRENTLY WITH TOYE" or "YET TO BE RETURNED TO US BY ELIJAH",
 * serial numbers embedded in half a dozen different delimiter styles
 * inside a single "MODEL/SERIAL NUMBER" column, etc.) — every
 * heuristic here is deliberately conservative: prefer a low-confidence
 * guess *plus a warning* over silently dropping a row, since the
 * verification bar is "row counts match the source sheets".
 */

export interface ParsedInventoryRow {
  sourceRow: number; // 1-based row number in the sheet, including header
  sourceSheetRowNumber: number; // the sheet's own "S/N" column value
  deviceType: 'Laptop' | 'Phone';
  brand: string;
  model: string;
  serialNumber: string;
  imei: string | null;
  department: string;
  status: AssetStatus;
  notes: string;
  /** Non-fatal — parsing succeeded, but used a fallback/guess. */
  warnings: string[];
}

export interface RowParseFailure {
  sourceRow: number;
  reason: string;
}

const titleCase = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const KNOWN_LAPTOP_BRANDS: Array<[RegExp, string]> = [
  [/\bLENOVO\b/i, 'Lenovo'],
  [/\bHP\b/i, 'HP'],
  [/\bDELL\b/i, 'Dell'],
  [/\bMACBOOK\b|\bAPPLE\b/i, 'Apple'],
];

const KNOWN_PHONE_BRANDS: Array<[RegExp, string]> = [
  [/\bSAMSUNG\b/i, 'Samsung'],
  [/\bINFINIX\b/i, 'Infinix'],
  [/\bITEL\b/i, 'Itel'],
  [/\bOPPO\b/i, 'Oppo'],
  [/\bVIVO\b/i, 'Vivo'],
  [/\bREDMI\b|\bXIAOMI\b/i, 'Xiaomi'],
  [/\bTECNO\b/i, 'Tecno'],
  [/\bIPHONE\b/i, 'Apple'],
];

// Words that could be mistaken for a serial by the trailing-token
// heuristic but are actually part of a model description.
const SERIAL_STOPWORDS = new Set([
  'HP', 'DELL', 'LENOVO', 'MACBOOK', 'PRO', 'GEN', 'WITH', 'MOUSE', 'CORE',
  'INTEL', 'LATITUDE', 'ELITEBOOK', 'ELITBOOK', 'ZBOOK', 'DESKTOP', 'DESTOP',
  'NEW', 'AS', 'REPLACEMENT', 'FOR', 'HER', 'HIS', 'BRAND', 'AND',
]);

// Requires at least one digit — a pure-letter token of plausible
// length ("SERIAL", "DESCRIPTION") is almost certainly an English
// word from a free-text note, not a real device serial/service tag.
const looksLikeSerial = (token: string): boolean =>
  /^[A-Z0-9]{5,16}$/i.test(token) &&
  /\d/.test(token) &&
  !SERIAL_STOPWORDS.has(token.toUpperCase());

/**
 * Extracts a brand + serial number from the free-text "MODEL/SERIAL
 * NUMBER" laptop column. Tries, in order: an explicit S/N or SN:
 * marker, a Lenovo PF-pattern token, a bracketed alphanumeric token,
 * then the last delimiter-separated alphanumeric-looking token. Falls
 * back to the full raw string as the serial if nothing matches — a
 * low-confidence guess, flagged with a warning, rather than a dropped
 * row.
 */
export function parseLaptopModelSerial(raw: string): {
  brand: string;
  serial: string;
  lowConfidence: boolean;
} {
  const trimmed = raw.trim();

  let brand = 'Unspecified';
  for (const [pattern, name] of KNOWN_LAPTOP_BRANDS) {
    if (pattern.test(trimmed)) {
      brand = name;
      break;
    }
  }

  const snMatch = trimmed.match(/S\s*\/?\s*N\s*[:.]?\s*([A-Z0-9]{5,16})/i);
  if (snMatch) return { brand, serial: snMatch[1].toUpperCase(), lowConfidence: false };

  const pfMatch = trimmed.match(/PF[A-Z0-9]{6,9}/i);
  if (pfMatch) return { brand, serial: pfMatch[0].toUpperCase(), lowConfidence: false };

  const parenMatch = trimmed.match(/\(([A-Z0-9]{5,16})\)/i);
  if (parenMatch && looksLikeSerial(parenMatch[1])) {
    return { brand, serial: parenMatch[1].toUpperCase(), lowConfidence: false };
  }

  const parts = trimmed.split(/[\s/,:;-]+/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (looksLikeSerial(parts[i])) {
      return { brand, serial: parts[i].toUpperCase(), lowConfidence: false };
    }
  }

  // Nothing matched — use the whole cleaned string so the row still
  // imports; flagged low-confidence so it's easy to find and fix later.
  const fallback = trimmed.replace(/\s+/g, ' ').slice(0, 64).toUpperCase();
  return { brand, serial: fallback, lowConfidence: true };
}

/** Phone "DEVICE SPECIFICATION" column: brand + full spec string as model. */
export function parsePhoneDeviceSpec(raw: string): { brand: string; model: string } {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  for (const [pattern, name] of KNOWN_PHONE_BRANDS) {
    if (pattern.test(trimmed)) return { brand: name, model: trimmed };
  }
  const firstWord = trimmed.split(' ')[0] || 'Unspecified';
  return { brand: titleCase(firstWord), model: trimmed };
}

/**
 * Maps the source's free-text "STATUS" column onto AssetStatus.
 * Checked in priority order since some values combine multiple
 * signals (e.g. "STOLEN/INACTIVE FROM FUNMILAYO..."). The raw string
 * is always preserved by the caller in `notes` regardless of which
 * branch matches, since this mapping is necessarily lossy.
 */
export function mapSourceStatus(
  rawStatus: string,
  hasDistinctPersonalHolder: boolean,
): { status: AssetStatus; lowConfidence: boolean } {
  const s = rawStatus.trim().toUpperCase();

  if (s.includes('STOLEN')) return { status: AssetStatus.Stolen, lowConfidence: false };
  if (s.includes('MISSING')) return { status: AssetStatus.Unaccounted, lowConfidence: false };
  if (s.includes('FAULTY')) return { status: AssetStatus.UnderRepair, lowConfidence: false };
  if (s.includes('CURRENTLY WITH') || s.includes('YET TO BE RETURNED')) {
    return { status: AssetStatus.Allocated, lowConfidence: false };
  }
  if (s.includes('INACTIVE')) return { status: AssetStatus.Available, lowConfidence: false };
  if (s.includes('ACTIVE')) {
    return {
      status: hasDistinctPersonalHolder ? AssetStatus.Allocated : AssetStatus.Available,
      lowConfidence: false,
    };
  }
  // Unrecognized free text — safest is "we don't actually know", not a guess.
  return { status: AssetStatus.Unaccounted, lowConfidence: true };
}

function isPersonalHolder(newlyAssigned: string, department: string): boolean {
  const a = newlyAssigned.trim().toUpperCase();
  const d = department.trim().toUpperCase();
  if (!a) return false;
  // Rows where "newly assigned" is the department/warehouse itself
  // mean the item went back to pooled stock, not a named person.
  return a !== d && !/WAREHOUSE|STORES|POOL/.test(a);
}

export function parseLaptopRow(
  row: unknown[],
  sourceRow: number,
): ParsedInventoryRow | RowParseFailure {
  const [sn, prevAssigned, modelSerial, newlyAssigned, department, status] = row as [
    number | null, string | null, string | null, string | null, string | null, string | null,
  ];

  if (!modelSerial || !String(modelSerial).trim()) {
    return { sourceRow, reason: 'missing MODEL/SERIAL NUMBER' };
  }
  if (!department || !String(department).trim()) {
    return { sourceRow, reason: 'missing DEPARTMENT' };
  }
  if (!status || !String(status).trim()) {
    return { sourceRow, reason: 'missing STATUS' };
  }

  const warnings: string[] = [];
  const rawModelSerial = String(modelSerial).trim();
  const { brand, serial, lowConfidence: serialLowConfidence } = parseLaptopModelSerial(rawModelSerial);
  if (serialLowConfidence) {
    warnings.push(`could not confidently extract a serial from "${rawModelSerial}" — used the full field as a fallback serial`);
  }

  const dept = titleCase(String(department));
  const holderName = String(newlyAssigned ?? '').trim();
  const hasHolder = isPersonalHolder(holderName, String(department));
  const { status: mappedStatus, lowConfidence: statusLowConfidence } = mapSourceStatus(
    String(status),
    hasHolder,
  );
  if (statusLowConfidence) {
    warnings.push(`unrecognized source status "${String(status).trim()}" — defaulted to Unaccounted`);
  }

  const noteParts = [
    `Source: Sapphire Virtual baseline inventory, LAPTOPS row ${sourceRow} (S/N ${sn}).`,
    `Raw MODEL/SERIAL NUMBER: "${rawModelSerial}".`,
    `Raw STATUS: "${String(status).trim()}".`,
  ];
  if (holderName) noteParts.push(`Newly assigned: ${holderName}.`);
  if (prevAssigned && String(prevAssigned).trim() !== holderName) {
    noteParts.push(`Previously assigned: ${String(prevAssigned).trim()}.`);
  }

  return {
    sourceRow,
    sourceSheetRowNumber: Number(sn),
    deviceType: 'Laptop',
    brand,
    model: 'Unspecified',
    serialNumber: serial,
    imei: null,
    department: dept,
    status: mappedStatus,
    notes: noteParts.join(' '),
    warnings,
  };
}

export function parsePhoneRow(
  row: unknown[],
  sourceRow: number,
): ParsedInventoryRow | RowParseFailure {
  const [sn, prevAssigned, deviceSpec, imeiRaw, newlyAssigned, department, status] = row as [
    number | null, string | null, string | null, number | string | null,
    string | null, string | null, string | null,
  ];

  if (!deviceSpec || !String(deviceSpec).trim()) {
    return { sourceRow, reason: 'missing DEVICE SPECIFICATION' };
  }
  if (imeiRaw == null || String(imeiRaw).trim() === '') {
    return { sourceRow, reason: 'missing IMEI NUMBER' };
  }
  if (!department || !String(department).trim()) {
    return { sourceRow, reason: 'missing DEPARTMENT' };
  }
  if (!status || !String(status).trim()) {
    return { sourceRow, reason: 'missing STATUS' };
  }

  const warnings: string[] = [];
  const imei = String(imeiRaw).trim();
  if (imei.length !== 15) {
    warnings.push(`IMEI "${imei}" is ${imei.length} digits, not the usual 15 — kept as-is`);
  }

  const rawDeviceSpec = String(deviceSpec).trim();
  const { brand, model } = parsePhoneDeviceSpec(rawDeviceSpec);
  const dept = titleCase(String(department));
  const holderName = String(newlyAssigned ?? '').trim();
  const hasHolder = isPersonalHolder(holderName, String(department));
  const { status: mappedStatus, lowConfidence: statusLowConfidence } = mapSourceStatus(
    String(status),
    hasHolder,
  );
  if (statusLowConfidence) {
    warnings.push(`unrecognized source status "${String(status).trim()}" — defaulted to Unaccounted`);
  }

  const noteParts = [
    `Source: Sapphire Virtual baseline inventory, PHONES row ${sourceRow} (S/N ${sn}).`,
    `Raw STATUS: "${String(status).trim()}".`,
    'No separate serial number given in source — IMEI reused as serialNumber too (a different unique-constrained column, so no collision).',
  ];
  if (holderName) noteParts.push(`Newly assigned: ${holderName}.`);
  if (prevAssigned && String(prevAssigned).trim() !== holderName) {
    noteParts.push(`Previously assigned: ${String(prevAssigned).trim()}.`);
  }

  return {
    sourceRow,
    sourceSheetRowNumber: Number(sn),
    deviceType: 'Phone',
    brand,
    model,
    serialNumber: imei,
    imei,
    department: dept,
    status: mappedStatus,
    notes: noteParts.join(' '),
    warnings,
  };
}

export function isParseFailure(
  x: ParsedInventoryRow | RowParseFailure,
): x is RowParseFailure {
  return 'reason' in x;
}
