import { Injectable } from '@nestjs/common';
import * as bwipjs from 'bwip-js';
import { BarcodeService } from '../../application/ports/barcode.port';

@Injectable()
export class BwipBarcodeService implements BarcodeService {
  async qrPngBuffer(payload: string, size = 8): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'qrcode',
      text: payload,
      scale: Math.max(1, Math.min(20, Math.round(size))),
      includetext: false,
      backgroundcolor: 'FFFFFF',
    });
  }

  async qrPngBase64(payload: string, size = 8): Promise<string> {
    const buf = await this.qrPngBuffer(payload, size);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }

  async barcodePngBuffer(payload: string): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text: payload,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
      backgroundcolor: 'FFFFFF',
    });
  }

  async barcodePngBase64(payload: string): Promise<string> {
    const buf = await this.barcodePngBuffer(payload);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
}
