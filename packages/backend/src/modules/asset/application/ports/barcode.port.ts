export const BARCODE_SERVICE = Symbol('BARCODE_SERVICE');

export interface BarcodeService {
  qrPngBase64(payload: string, size?: number): Promise<string>;
  qrPngBuffer(payload: string, size?: number): Promise<Buffer>;
  barcodePngBase64(payload: string): Promise<string>;
  barcodePngBuffer(payload: string): Promise<Buffer>;
}
