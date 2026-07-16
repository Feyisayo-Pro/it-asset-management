import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfExportService {
  generate(
    data: Record<string, unknown>[],
    title = 'Report',
  ): Buffer {
    if (data.length === 0) {
      return buildPdf(title, [], []);
    }
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
    return buildPdf(title, columns, rows);
  }
}

function buildPdf(title: string, columns: string[], rows: string[][]): Buffer {
  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  if (columns.length > 0) {
    const colWidths = columns.map((c, i) => {
      const maxData = rows.reduce((m, r) => Math.max(m, (r[i] ?? '').length), 0);
      return Math.max(c.length, maxData, 8);
    });

    const headerLine = columns.map((c, i) => c.padEnd(colWidths[i])).join(' | ');
    const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
    lines.push(headerLine);
    lines.push(separator);

    for (const row of rows) {
      const line = row.map((v, i) => v.padEnd(colWidths[i])).join(' | ');
      lines.push(line);
    }
  } else {
    lines.push('No data available.');
  }

  const text = lines.join('\n');
  const textBytes = Buffer.from(text, 'utf-8');

  const stream = new PdfStream();
  stream.addLine('%PDF-1.4');
  const catalogRef = stream.reserveObj();
  const pagesRef = stream.reserveObj();
  const pageRef = stream.reserveObj();
  const fontRef = stream.reserveObj();
  const contentRef = stream.reserveObj();

  stream.writeObj(catalogRef, `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  stream.writeObj(pagesRef, `<< /Type /Pages /Kids [${pageRef} 0 R] /Count 1 >>`);
  stream.writeObj(fontRef, `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`);

  const contentLines: string[] = [];
  contentLines.push('BT');
  contentLines.push(`/F1 9 Tf`);
  contentLines.push(`50 750 Td`);
  contentLines.push(`14 TL`);

  const maxChars = 100;
  for (const line of text.split('\n').slice(0, 50)) {
    const safe = line
      .slice(0, maxChars)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    contentLines.push(`(${safe}) Tj T*`);
  }
  if (text.split('\n').length > 50) {
    contentLines.push(`(... ${text.split('\\n').length - 50} more rows ...) Tj T*`);
  }
  contentLines.push('ET');
  const contentStr = contentLines.join('\n');
  const contentBytes = Buffer.from(contentStr, 'utf-8');

  stream.writeObj(
    contentRef,
    `<< /Length ${contentBytes.length} >>\nstream\n${contentStr}\nendstream`,
  );
  stream.writeObj(
    pageRef,
    `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 612 792] ` +
    `/Resources << /Font << /F1 ${fontRef} 0 R >> >> ` +
    `/Contents ${contentRef} 0 R >>`,
  );

  const xrefOffset = stream.buffer.length;
  stream.addLine('xref');
  stream.addLine(`0 ${stream.objCount + 1}`);
  stream.addLine('0000000000 65535 f ');
  for (let i = 1; i <= stream.objCount; i++) {
    stream.addLine(String(stream.offsets[i]).padStart(10, '0') + ' 00000 n ');
  }
  stream.addLine('trailer');
  stream.addLine(`<< /Size ${stream.objCount + 1} /Root ${catalogRef} 0 R >>`);
  stream.addLine('startxref');
  stream.addLine(String(xrefOffset));
  stream.addLine('%%EOF');

  return stream.buffer;
}

class PdfStream {
  parts: Buffer[] = [];
  offsets: Record<number, number> = {};
  objCount = 0;
  private nextObj = 1;

  get buffer(): Buffer {
    return Buffer.concat(this.parts);
  }

  get length(): number {
    return this.parts.reduce((s, p) => s + p.length, 0);
  }

  addLine(line: string): void {
    this.parts.push(Buffer.from(line + '\n', 'utf-8'));
  }

  reserveObj(): number {
    this.objCount++;
    return this.nextObj++;
  }

  writeObj(ref: number, content: string): void {
    this.offsets[ref] = this.length;
    this.addLine(`${ref} 0 obj`);
    this.addLine(content);
    this.addLine('endobj');
  }
}
