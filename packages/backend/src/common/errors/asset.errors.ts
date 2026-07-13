import { ApplicationError, DomainError } from './domain.error';

export class AssetNotFoundError extends ApplicationError {
  readonly code = 'ASSET_NOT_FOUND';
  constructor(id: string) {
    super('Asset not found', { id });
  }
}

export class DuplicateAssetTagError extends ApplicationError {
  readonly code = 'DUPLICATE_ASSET_TAG';
  constructor(tag: string) {
    super('Asset tag already in use', { assetTag: tag });
  }
}

export class DuplicateSerialNumberError extends ApplicationError {
  readonly code = 'DUPLICATE_SERIAL_NUMBER';
  constructor(sn: string) {
    super('Serial number already registered', { serialNumber: sn });
  }
}

export class DuplicateImeiError extends ApplicationError {
  readonly code = 'DUPLICATE_IMEI';
  constructor(imei: string) {
    super('IMEI already registered', { imei });
  }
}

export class InvalidAssetStatusTransitionError extends DomainError {
  readonly code = 'INVALID_ASSET_STATUS_TRANSITION';
  constructor(from: string, to: string) {
    super(`Illegal asset status transition ${from} → ${to}`, { from, to });
  }
}

export class WarrantyBeforePurchaseError extends DomainError {
  readonly code = 'ASSET_WARRANTY_BEFORE_PURCHASE';
  constructor() {
    super('Warranty expiry cannot precede the purchase date');
  }
}
