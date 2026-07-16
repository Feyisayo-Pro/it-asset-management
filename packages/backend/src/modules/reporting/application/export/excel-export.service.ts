import { Injectable } from '@nestjs/common';

@Injectable()
export class ExcelExportService {
  generate(data: Record<string, unknown>[], sheetName = 'Report'): Buffer {
    if (data.length === 0) return Buffer.from('');
    const columns = Object.keys(data[0]);
    const rows = data.map((row) =>
      columns.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      }),
    );

    const xml = buildSpreadsheetML(columns, rows, sheetName);
    return Buffer.from(xml, 'utf-8');
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSpreadsheetML(
  headers: string[],
  rows: string[][],
  sheetName: string,
): string {
  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');
  const headerRow = `<Row ss:StyleID="header">${headerCells}</Row>`;

  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((v) => {
          const isNum = v !== '' && !isNaN(Number(v));
          const type = isNum ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${type}">${escapeXml(v)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D9E2F3" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}
