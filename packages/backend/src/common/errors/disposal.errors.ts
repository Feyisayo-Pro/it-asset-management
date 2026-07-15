import { ApplicationError, DomainError } from './domain.error';

export class DisposalNotFoundError extends ApplicationError {
  readonly code = 'DISPOSAL_NOT_FOUND';
  constructor(id: string) {
    super('Disposal record not found', { id });
  }
}

export class ActiveDisposalExistsError extends ApplicationError {
  readonly code = 'ACTIVE_DISPOSAL_EXISTS';
  constructor(assetId: string) {
    super('A disposal request already exists for this asset', { assetId });
  }
}

export class AssetAlreadyDisposedError extends ApplicationError {
  readonly code = 'ASSET_ALREADY_DISPOSED';
  constructor(assetId: string) {
    super('Asset is already disposed and cannot be modified', { assetId });
  }
}

export class DisposalRequesterCannotApproveError extends ApplicationError {
  readonly code = 'DISPOSAL_REQUESTER_CANNOT_APPROVE';
  constructor() {
    super('The approver must be different from the requester (segregation of duties)');
  }
}

export class DisposalAlreadyResolvedError extends ApplicationError {
  readonly code = 'DISPOSAL_ALREADY_RESOLVED';
  constructor(id: string, status: string) {
    super('Disposal has already been resolved', { id, status });
  }
}

export class DisposalEvidenceRequiredError extends DomainError {
  readonly code = 'DISPOSAL_EVIDENCE_REQUIRED';
  constructor() {
    super('Supporting evidence is required for disposal');
  }
}

export class DisposalApprovalSignatureRequiredError extends ApplicationError {
  readonly code = 'DISPOSAL_APPROVAL_SIGNATURE_REQUIRED';
  constructor() {
    super('Approving a disposal requires the approver signature');
  }
}

export class DisposalRejectionReasonRequiredError extends ApplicationError {
  readonly code = 'DISPOSAL_REJECTION_REASON_REQUIRED';
  constructor() {
    super('Rejecting a disposal requires a reason');
  }
}
