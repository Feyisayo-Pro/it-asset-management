import { ListAssetsUseCase } from '../../../src/modules/asset/application/use-cases/list-assets.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { AssetStatus } from '../../../src/modules/asset/domain/value-objects/asset-status';
import { FakeAssetRepository } from './fakes';

const seed = (assets: FakeAssetRepository) => {
  const make = (
    id: string,
    tag: string,
    sn: string,
    officeLocation: string,
    department: string,
    status: AssetStatus,
  ) => {
    const a = Asset.register({
      id,
      assetTag: tag,
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: sn,
      officeLocation,
      department,
      now: new Date('2026-01-01'),
    });
    if (status !== AssetStatus.Registration) {
      a.changeStatus(AssetStatus.Available, new Date('2026-01-01'));
      if (status !== AssetStatus.Available) a.changeStatus(status, new Date('2026-01-01'));
    }
    assets.assets.set(id, a);
  };

  make('a1', 'AST-2026-00001', 'SN1', 'Lagos', 'Engineering', AssetStatus.Available);
  make('a2', 'AST-2026-00002', 'SN2', 'Lagos', 'Sales', AssetStatus.Allocated);
  make('a3', 'AST-2026-00003', 'SN3', 'Abuja', 'Engineering', AssetStatus.Available);
};

describe('ListAssetsUseCase', () => {
  it('filters by office location', async () => {
    const assets = new FakeAssetRepository();
    seed(assets);
    const useCase = new ListAssetsUseCase(assets);
    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
      officeLocation: 'Lagos',
    });
    expect(result.total).toBe(2);
    expect(result.data.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });

  it('combines status, department, and location filters', async () => {
    const assets = new FakeAssetRepository();
    seed(assets);
    const useCase = new ListAssetsUseCase(assets);
    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
      status: AssetStatus.Available,
      department: 'Engineering',
      officeLocation: 'Lagos',
    });
    expect(result.data.map((a) => a.id)).toEqual(['a1']);
  });

  it('paginates results', async () => {
    const assets = new FakeAssetRepository();
    seed(assets);
    const useCase = new ListAssetsUseCase(assets);
    const page1 = await useCase.execute({ page: 1, pageSize: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);
    const page2 = await useCase.execute({ page: 2, pageSize: 2 });
    expect(page2.data).toHaveLength(1);
  });
});
