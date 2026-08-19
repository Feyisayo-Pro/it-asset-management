import { ExportAssetsUseCase } from '../../../src/modules/asset/application/use-cases/export-assets.use-case';
import { Asset } from '../../../src/modules/asset/domain/entities/asset.entity';
import { FakeAssetRepository } from './fakes';

const streamToString = (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });

describe('ExportAssetsUseCase', () => {
  it('streams matching assets as CSV without buffering the whole result set up front', async () => {
    const assets = new FakeAssetRepository();
    const a = Asset.register({
      id: 'a1',
      assetTag: 'AST-2026-00001',
      deviceType: 'Laptop',
      brand: 'Acme',
      model: 'X1',
      serialNumber: 'SN1',
      officeLocation: 'Lagos',
      department: 'Engineering',
      now: new Date('2026-01-01'),
    });
    assets.assets.set(a.id, a);

    const useCase = new ExportAssetsUseCase(assets);
    const stream = await useCase.streamCsv({});
    const csv = await streamToString(stream);

    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      'asset_tag,device_type,brand,model,serial_number,imei,status,purchase_date,purchase_amount,purchase_currency,vendor,warranty_expiry,office_location,department,assigned_employee_name,current_holder_id,notes',
    );
    expect(lines[1]).toContain('AST-2026-00001');
    expect(lines[1]).toContain('Lagos');
    expect(lines[1]).toContain('Engineering');
  });

  it('produces an empty (header-only) stream when nothing matches the filters', async () => {
    const assets = new FakeAssetRepository();
    const useCase = new ExportAssetsUseCase(assets);
    const stream = await useCase.streamCsv({ officeLocation: 'Nowhere' });
    const csv = await streamToString(stream);
    expect(csv.trim().split('\n')).toHaveLength(1); // header only
  });
});
