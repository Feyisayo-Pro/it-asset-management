import { RegisterAssetUseCase } from '../../../src/modules/asset/application/use-cases/register-asset.use-case';
import {
  DuplicateAssetTagError,
  DuplicateImeiError,
  DuplicateSerialNumberError,
  InvalidAssetTagFormatError,
} from '../../../src/common/errors/asset.errors';
import {
  FakeClock,
  FakeEventPublisher,
  FakeIdGenerator,
} from '../fakes/fakes';
import { FakeAssetRepository } from './fakes';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';

const build = () => {
  const assets = new FakeAssetRepository();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock(new Date('2026-07-10T00:00:00Z'));
  const events = new FakeEventPublisher();
  const useCase = new RegisterAssetUseCase(
    assets,
    ids,
    clock,
    events as unknown as never,
  );
  return { useCase, assets, ids, clock, events };
};

describe('RegisterAssetUseCase', () => {
  it('generates a sequential asset tag when one is not supplied', async () => {
    const ctx = build();
    const a = await ctx.useCase.execute({
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
    });
    expect(a.assetTag).toBe('AST-2026-00001');
    const b = await ctx.useCase.execute({
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN2',
    });
    expect(b.assetTag).toBe('AST-2026-00002');
  });

  it('rejects duplicate serial number', async () => {
    const ctx = build();
    await ctx.useCase.execute({
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
    });
    await expect(
      ctx.useCase.execute({
        deviceType: 'Laptop',
        brand: 'Acme',
        model: 'X1',
        serialNumber: 'SN1',
      }),
    ).rejects.toBeInstanceOf(DuplicateSerialNumberError);
  });

  it('rejects duplicate asset tag when one is provided', async () => {
    const ctx = build();
    await ctx.useCase.execute({
      assetTag: 'AST-2026-00099',
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
    });
    await expect(
      ctx.useCase.execute({
        assetTag: 'AST-2026-00099',
        deviceType: 'Laptop',
        brand: 'Acme',
        model: 'X1',
        serialNumber: 'SN2',
      }),
    ).rejects.toBeInstanceOf(DuplicateAssetTagError);
  });

  it('rejects a manually supplied tag that does not match the canonical format', async () => {
    const ctx = build();
    await expect(
      ctx.useCase.execute({
        assetTag: 'CUSTOM-1',
        deviceType: 'Laptop',
        brand: 'Acme',
        model: 'X1',
        serialNumber: 'SN1',
      }),
    ).rejects.toBeInstanceOf(InvalidAssetTagFormatError);
  });

  it('rejects duplicate IMEI when present', async () => {
    const ctx = build();
    await ctx.useCase.execute({
      deviceType: 'Phone',
      brand: 'A',
      model: 'B',
      serialNumber: 'S1',
      imei: '123456789012345',
    });
    await expect(
      ctx.useCase.execute({
        deviceType: 'Phone',
        brand: 'A',
        model: 'B',
        serialNumber: 'S2',
        imei: '123456789012345',
      }),
    ).rejects.toBeInstanceOf(DuplicateImeiError);
  });

  it('emits AssetRegisteredEvent and appends initial history', async () => {
    const ctx = build();
    await ctx.useCase.execute({
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
    });
    expect(ctx.events.namesOf()).toContain('asset.registered');
    expect(ctx.assets.history).toHaveLength(1);
    expect(ctx.assets.history[0].toStatus).toBe(AssetStatus.Registration);
  });

  it('markAvailableImmediately transitions and appends a second history entry', async () => {
    const ctx = build();
    await ctx.useCase.execute({
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
      markAvailableImmediately: true,
    });
    expect(ctx.assets.history).toHaveLength(2);
    expect(ctx.assets.history[1].toStatus).toBe(AssetStatus.Available);
    expect(ctx.events.namesOf()).toEqual(
      expect.arrayContaining(['asset.status-changed', 'asset.registered']),
    );
  });
});
