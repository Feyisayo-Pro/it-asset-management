import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import {
  InvalidAssetStatusTransitionError,
  WarrantyBeforePurchaseError,
} from '../../../src/common/errors/asset.errors';

const now = new Date('2026-07-10T00:00:00Z');
const build = () =>
  Asset.register({
    id: 'a1',
    assetTag: 'ast-2026-00001',
    deviceType: 'Laptop',
    brand: 'Acme',
    model: 'X1',
    serialNumber: 'SN123',
    now,
  });

describe('Asset entity', () => {
  it('normalizes asset tag to upper case', () => {
    expect(build().assetTag).toBe('AST-2026-00001');
  });

  it('starts in Registration status', () => {
    expect(build().status).toBe(AssetStatus.Registration);
  });

  it('rejects warranty date before purchase date', () => {
    expect(() =>
      Asset.register({
        id: 'a2',
        assetTag: 'AST-2026-00002',
        deviceType: 'Laptop',
        brand: 'Acme',
        model: 'X1',
        serialNumber: 'SN2',
        purchaseDate: new Date('2026-06-01'),
        warrantyExpiry: new Date('2026-05-01'),
      }),
    ).toThrow(WarrantyBeforePurchaseError);
  });

  it('allows valid status transitions', () => {
    const a = build();
    a.changeStatus(AssetStatus.Available, now);
    expect(a.status).toBe(AssetStatus.Available);
    a.changeStatus(AssetStatus.Allocated, now, 'emp-1');
    expect(a.status).toBe(AssetStatus.Allocated);
    expect(a.currentHolderId).toBe('emp-1');
  });

  it('rejects invalid transitions', () => {
    const a = build();
    a.changeStatus(AssetStatus.Available, now);
    a.changeStatus(AssetStatus.Allocated, now);
    expect(() => a.changeStatus(AssetStatus.Registration, now)).toThrow(
      InvalidAssetStatusTransitionError,
    );
  });

  it('rejects any transition out of Disposed', () => {
    const a = build();
    a.changeStatus(AssetStatus.Available, now);
    a.changeStatus(AssetStatus.Disposed, now);
    expect(() => a.changeStatus(AssetStatus.Available, now)).toThrow(
      InvalidAssetStatusTransitionError,
    );
  });
});
