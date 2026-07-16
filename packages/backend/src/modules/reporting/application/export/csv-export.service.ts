import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class CsvExportService {
  generate(data: Record<string, unknown>[]): Buffer {
    if (data.length === 0) return Buffer.from('');
    const columns = Object.keys(data[0]);
    const csv = stringify(data, {
      header: true,
      columns,
      cast: {
        date: (v) => v.toISOString(),
        object: (v) => JSON.stringify(v),
      },
    });
    return Buffer.from(csv, 'utf-8');
  }
}
