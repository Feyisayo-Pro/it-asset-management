import {
  isParseFailure,
  mapSourceStatus,
  parseLaptopModelSerial,
  parseLaptopRow,
  parsePhoneDeviceSpec,
  parsePhoneRow,
} from '../../../src/database/seeds/lib/inventory-xlsx-parser';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';

describe('parseLaptopModelSerial — real source string variety', () => {
  it('extracts a Lenovo PF-pattern serial with a dash', () => {
    expect(parseLaptopModelSerial('LENOVO-PF4N9WZC')).toEqual({
      brand: 'Lenovo', serial: 'PF4N9WZC', lowConfidence: false,
    });
  });

  it('extracts a Lenovo PF-pattern serial embedded in a parenthetical note', () => {
    const r = parseLaptopModelSerial('LENOVO DESKTOP -3D047L1(LENOVO-PF4J6CFZ)');
    expect(r.brand).toBe('Lenovo');
    expect(r.serial).toBe('PF4J6CFZ');
    expect(r.lowConfidence).toBe(false);
  });

  it('extracts a bare PF-pattern serial with no brand prefix', () => {
    expect(parseLaptopModelSerial('PF4N9WXX')).toEqual({
      brand: 'Unspecified', serial: 'PF4N9WXX', lowConfidence: false,
    });
  });

  it('prefers an explicit S/N: marker (Dell, comma + inline spec)', () => {
    const r = parseLaptopModelSerial('DELL LATITUDE 7390, INTEL CORE i7 8TH GEN…S/N:2191839086');
    expect(r.brand).toBe('Dell');
    expect(r.serial).toBe('2191839086');
    expect(r.lowConfidence).toBe(false);
  });

  it('handles "SN:" with no space before the value (Dell, slash-separated)', () => {
    const r = parseLaptopModelSerial('DELL LATITUDE 7480/SN:JZS64H2');
    expect(r.brand).toBe('Dell');
    expect(r.serial).toBe('JZS64H2');
  });

  it('handles HP colon-delimited serial', () => {
    expect(parseLaptopModelSerial('HP:5CD7O24PRX')).toEqual({
      brand: 'HP', serial: '5CD7O24PRX', lowConfidence: false,
    });
  });

  it('handles HP dash-delimited serial', () => {
    expect(parseLaptopModelSerial('HP-5CD43655N8')).toEqual({
      brand: 'HP', serial: '5CD43655N8', lowConfidence: false,
    });
  });

  it('handles HP slash-delimited model+serial', () => {
    const r = parseLaptopModelSerial('HP ELITEBOOK 830 G6/SN:5CG0128L52');
    expect(r.brand).toBe('HP');
    expect(r.serial).toBe('5CG0128L52');
  });

  it('handles a parenthetical S/N with trailing accessory note', () => {
    const r = parseLaptopModelSerial('HP ZBOOK i5 G6 (S/N:5CD0208ZQB) WITH A MOUSE');
    expect(r.brand).toBe('HP');
    expect(r.serial).toBe('5CD0208ZQB');
  });

  it('extracts a MacBook serial after a slash', () => {
    const r = parseLaptopModelSerial('MACBOOK PRO 2017 / FVFX5FLPHV22');
    expect(r.brand).toBe('Apple');
    expect(r.serial).toBe('FVFX5FLPHV22');
  });

  it('does not mistake "REPLACEMENT FOR PF4X9RD3" for the actual serial when a real one precedes it', () => {
    const r = parseLaptopModelSerial('LENOVO-PF4S33Q2(BRAND NEW AS REPLACEMENT FOR PF4X9RD3)');
    expect(r.serial).toBe('PF4S33Q2');
  });

  it('extracts the trailing alphanumeric token even with no recognized brand keyword', () => {
    const r = parseLaptopModelSerial('DESTOP-D7H20HQ');
    expect(r.serial).toBe('D7H20HQ');
    expect(r.brand).toBe('Unspecified');
    expect(r.lowConfidence).toBe(false);
  });

  it('falls back to the full cleaned string, flagged low-confidence, when nothing structured matches', () => {
    const r = parseLaptopModelSerial('a very generic free text description with no identifiable serial');
    expect(r.lowConfidence).toBe(true);
    expect(r.serial.length).toBeGreaterThan(0);
  });
});

describe('parsePhoneDeviceSpec', () => {
  it('detects Samsung and keeps the full spec as model', () => {
    expect(parsePhoneDeviceSpec('SAMSUNG A05 LTE (4GB +64GB)')).toEqual({
      brand: 'Samsung', model: 'SAMSUNG A05 LTE (4GB +64GB)',
    });
  });

  it('detects Infinix', () => {
    expect(parsePhoneDeviceSpec('Infinix Hot 20i 4GB/64GB').brand).toBe('Infinix');
  });

  it('detects Xiaomi from "REDMI"', () => {
    expect(parsePhoneDeviceSpec('REDMI A3 PRO(RECOVERED FROM A SENTIFLEX CUSTOMER)').brand).toBe('Xiaomi');
  });

  it('falls back to the first word, title-cased, for an unrecognized brand', () => {
    expect(parsePhoneDeviceSpec('SomeBrand X1').brand).toBe('Somebrand');
  });
});

describe('mapSourceStatus — real free-text status variety', () => {
  it('maps STOLEN', () => {
    expect(mapSourceStatus('STOLEN', true)).toEqual({ status: AssetStatus.Stolen, lowConfidence: false });
  });

  it('maps a compound STOLEN/INACTIVE string to Stolen (priority order)', () => {
    expect(mapSourceStatus('STOLEN/INACTIVE FROM FUNMILAYO AT THE OPEBI OFFICE', true).status).toBe(
      AssetStatus.Stolen,
    );
  });

  it('maps MISSING to Unaccounted', () => {
    expect(mapSourceStatus('MISSING', false).status).toBe(AssetStatus.Unaccounted);
  });

  it('maps FAULTY to UnderRepair', () => {
    expect(mapSourceStatus('FAULTY', true).status).toBe(AssetStatus.UnderRepair);
  });

  it('maps a "CURRENTLY WITH <name>" free-text status to Allocated', () => {
    expect(mapSourceStatus('CURRENTLY WITH MRS EBUN', true).status).toBe(AssetStatus.Allocated);
  });

  it('maps a "YET TO BE RETURNED" free-text status to Allocated', () => {
    expect(mapSourceStatus('YET TO BE RETURNED TO US BY ELIJAH', true).status).toBe(AssetStatus.Allocated);
  });

  it('maps INACTIVE (with trailing padding) to Available', () => {
    expect(mapSourceStatus('INACTIVE    ', false).status).toBe(AssetStatus.Available);
  });

  it('maps ACTIVE with a distinct personal holder to Allocated', () => {
    expect(mapSourceStatus('ACTIVE', true)).toEqual({ status: AssetStatus.Allocated, lowConfidence: false });
  });

  it('maps ACTIVE with no distinct personal holder (pooled stock) to Available', () => {
    expect(mapSourceStatus('ACTIVE', false)).toEqual({ status: AssetStatus.Available, lowConfidence: false });
  });

  it('maps a combined "MARYLAND WAREHOUSE (ACTIVE)" status to Available (no personal holder)', () => {
    expect(mapSourceStatus('MARYLAND WAREHOUSE (ACTIVE)', false).status).toBe(AssetStatus.Available);
  });

  it('flags an unrecognized status as low-confidence and defaults to Unaccounted', () => {
    const r = mapSourceStatus('SOMETHING ENTIRELY NEW', true);
    expect(r.status).toBe(AssetStatus.Unaccounted);
    expect(r.lowConfidence).toBe(true);
  });
});

describe('parseLaptopRow / parsePhoneRow — end to end on real row shapes', () => {
  it('parses a real laptop row into a full record with source-derived notes', () => {
    const row = [1, 'OGUNSOLA GABRIEL', 'DESTOP-D7H20HQ', 'OGUNSOLA GABRIEL', 'FINANCE', 'ACTIVE', 'CHECKED'];
    const result = parseLaptopRow(row, 2);
    expect(isParseFailure(result)).toBe(false);
    if (!isParseFailure(result)) {
      expect(result.deviceType).toBe('Laptop');
      expect(result.serialNumber).toBe('D7H20HQ');
      expect(result.department).toBe('Finance');
      expect(result.status).toBe(AssetStatus.Allocated);
      expect(result.notes).toContain('OGUNSOLA GABRIEL');
      expect(result.notes).toContain('DESTOP-D7H20HQ');
    }
  });

  it('reports a parse failure (not a crash) for a laptop row missing department', () => {
    const row = [5, 'X', 'LENOVO-PF4K9930', 'X', null, 'ACTIVE'];
    const result = parseLaptopRow(row, 6);
    expect(isParseFailure(result)).toBe(true);
  });

  it('parses a real phone row, reusing IMEI as serialNumber', () => {
    const row = [1, 'OMOJOKUN BISOLA', 'SAMSUNG A05 LTE (4GB +64GB)', 354660975440853, 'OMOJOKUN BISOLA', 'COLLECTIONS', 'ACTIVE'];
    const result = parsePhoneRow(row, 2);
    expect(isParseFailure(result)).toBe(false);
    if (!isParseFailure(result)) {
      expect(result.deviceType).toBe('Phone');
      expect(result.imei).toBe('354660975440853');
      expect(result.serialNumber).toBe('354660975440853');
      expect(result.brand).toBe('Samsung');
      expect(result.status).toBe(AssetStatus.Allocated);
    }
  });

  it('reports a parse failure for a phone row missing IMEI', () => {
    const row = [1, 'X', 'SAMSUNG A05', null, 'X', 'COLLECTIONS', 'ACTIVE'];
    const result = parsePhoneRow(row, 2);
    expect(isParseFailure(result)).toBe(true);
  });

  it('maps the pooled-warehouse laptop row (INACTIVE, no personal holder) to Available', () => {
    const row = [3, 'DEBRAH ALEXANDER MARTINS', 'LENOVO-PF4N9WZC', 'MARYLAND WAREHOUSE', 'MARYLAND WAREHOUSE', 'INACTIVE    ', 'CHECKED'];
    const result = parseLaptopRow(row, 4);
    expect(isParseFailure(result)).toBe(false);
    if (!isParseFailure(result)) {
      expect(result.status).toBe(AssetStatus.Available);
    }
  });
});
