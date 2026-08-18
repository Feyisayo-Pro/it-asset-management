import { ApplicationError } from './domain.error';

export class ReturnNotFoundError extends ApplicationError {
  readonly code = 'RETURN_NOT_FOUND';
  constructor(id: string) {
    super('Return record not found', { id });
  }
}

export class AssetNotReturnableError extends ApplicationError {
  readonly code = 'ASSET_NOT_RETURNABLE';
  constructor(assetId: string, status: string) {
    super('Only allocated assets can be returned', { assetId, status });
  }
}

export class ActiveReturnExistsError extends ApplicationError {
  readonly code = 'ACTIVE_RETURN_EXISTS';
  constructor(assetId: string) {
    super('An active return already exists for this asset', { assetId });
  }
}

export class NotAssetHolderError extends ApplicationError {
  readonly code = 'NOT_ASSET_HOLDER';
  constructor() {
    super('Employees can only return assets assigned to them');
  }
}

export class ReturnItemsRequiredError extends ApplicationError {
  readonly code = 'RETURN_ITEMS_REQUIRED';
  constructor() {
    super('At least one returned item must be recorded');
  }
}

export class ReturnItemNotesRequiredError extends ApplicationError {
  readonly code = 'RETURN_ITEM_NOTES_REQUIRED';
  constructor(itemType: string) {
    super('Missing or damaged items require notes', { itemType });
  }
}

export class AssessmentIncompleteError extends ApplicationError {
  readonly code = 'ASSESSMENT_INCOMPLETE';
  constructor(reason: string) {
    super(`Assessment is incomplete: ${reason}`, { reason });
  }
}
