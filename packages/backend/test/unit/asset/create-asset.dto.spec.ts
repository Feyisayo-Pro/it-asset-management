import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto } from '../../../src/modules/asset/presentation/dto/create-asset.dto';
import { UpdateAssetDto } from '../../../src/modules/asset/presentation/dto/update-asset.dto';

const base = {
  deviceType: 'Laptop',
  brand: 'Acme',
  model: 'X1',
  serialNumber: 'SN1',
};

describe('CreateAssetDto validation', () => {
  it('rejects a manually supplied tag with the wrong format', async () => {
    const dto = plainToInstance(CreateAssetDto, { ...base, assetTag: 'CUSTOM-1' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'assetTag')).toBe(true);
  });

  it('accepts a manually supplied tag in the canonical format', async () => {
    const dto = plainToInstance(CreateAssetDto, { ...base, assetTag: 'AST-2026-00001' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'assetTag')).toBe(false);
  });

  it('accepts an omitted tag (server auto-generates)', async () => {
    const dto = plainToInstance(CreateAssetDto, { ...base });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'assetTag')).toBe(false);
  });

  it('rejects warrantyExpiry before purchaseDate', async () => {
    const dto = plainToInstance(CreateAssetDto, {
      ...base,
      purchaseDate: '2026-06-01',
      warrantyExpiry: '2026-05-01',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'warrantyExpiry')).toBe(true);
  });

  it('accepts warrantyExpiry on or after purchaseDate', async () => {
    const dto = plainToInstance(CreateAssetDto, {
      ...base,
      purchaseDate: '2026-06-01',
      warrantyExpiry: '2026-06-01',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'warrantyExpiry')).toBe(false);
  });
});

describe('UpdateAssetDto validation', () => {
  it('rejects warrantyExpiry before purchaseDate when both are supplied in the same patch', async () => {
    const dto = plainToInstance(UpdateAssetDto, {
      purchaseDate: '2026-06-01',
      warrantyExpiry: '2026-01-01',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'warrantyExpiry')).toBe(true);
  });

  it('skips the cross-field check when only warrantyExpiry is patched', async () => {
    const dto = plainToInstance(UpdateAssetDto, { warrantyExpiry: '2020-01-01' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'warrantyExpiry')).toBe(false);
  });
});
