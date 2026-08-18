import {
  DisposalAlreadyResolvedError,
  DisposalEvidenceRequiredError,
  DisposalRejectionReasonRequiredError,
  DisposalRequesterCannotApproveError,
} from '../../../../common/errors/disposal.errors';
import { ApproverSignature } from '../value-objects/approver-signature';
import {
  DisposalMethod,
  DisposalReason,
  DisposalStatus,
  TERMINAL_DISPOSAL_STATUSES,
} from '../value-objects/disposal-enums';

export interface DisposalRecordProps {
  id: string;
  assetId: string;
  requestedByUserId: string;
  approvedByUserId: string | null;
  witnessUserId: string | null;
  reason: DisposalReason;
  method: DisposalMethod;
  status: DisposalStatus;
  requestNotes: string | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  signatureName: string | null;
  signatureIp: string | null;
  evidenceUrls: string[];
  photoUrls: string[];
  disposalDate: Date | null;
  requestedAt: Date;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DisposalRecord aggregate. Guards two invariants:
 *   1. Once resolved (Approved | Rejected) it cannot be mutated.
 *   2. The approver must be a different user from the requester
 *      (segregation of duties).
 * Everything else — flipping the asset to Disposed, writing audit
 * entries, notifying — is a side-effect the event handlers own.
 */
export class DisposalRecord {
  private constructor(private props: DisposalRecordProps) {}

  static hydrate(props: DisposalRecordProps): DisposalRecord {
    return new DisposalRecord(props);
  }

  static request(input: {
    id: string;
    assetId: string;
    requestedByUserId: string;
    reason: DisposalReason;
    method: DisposalMethod;
    requestNotes?: string | null;
    evidenceUrls?: string[];
    photoUrls?: string[];
    now?: Date;
  }): DisposalRecord {
    const evidence = (input.evidenceUrls ?? []).map((u) => u.trim()).filter(Boolean);
    const photos = (input.photoUrls ?? []).map((u) => u.trim()).filter(Boolean);
    // At least one piece of supporting evidence — a photo, a vendor
    // quote, a lost-property report, whatever — must accompany every
    // request. The audit report has nothing to cite otherwise.
    if (evidence.length + photos.length === 0) {
      throw new DisposalEvidenceRequiredError();
    }
    const now = input.now ?? new Date();
    return new DisposalRecord({
      id: input.id,
      assetId: input.assetId,
      requestedByUserId: input.requestedByUserId,
      approvedByUserId: null,
      witnessUserId: null,
      reason: input.reason,
      method: input.method,
      status: 'Requested',
      requestNotes: input.requestNotes?.trim() || null,
      approvalNotes: null,
      rejectionReason: null,
      signatureName: null,
      signatureIp: null,
      evidenceUrls: evidence,
      photoUrls: photos,
      disposalDate: null,
      requestedAt: now,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get assetId(): string { return this.props.assetId; }
  get requestedByUserId(): string { return this.props.requestedByUserId; }
  get approvedByUserId(): string | null { return this.props.approvedByUserId; }
  get witnessUserId(): string | null { return this.props.witnessUserId; }
  get reason(): DisposalReason { return this.props.reason; }
  get method(): DisposalMethod { return this.props.method; }
  get status(): DisposalStatus { return this.props.status; }
  get requestNotes(): string | null { return this.props.requestNotes; }
  get approvalNotes(): string | null { return this.props.approvalNotes; }
  get rejectionReason(): string | null { return this.props.rejectionReason; }
  get signatureName(): string | null { return this.props.signatureName; }
  get signatureIp(): string | null { return this.props.signatureIp; }
  get evidenceUrls(): string[] { return [...this.props.evidenceUrls]; }
  get photoUrls(): string[] { return [...this.props.photoUrls]; }
  get disposalDate(): Date | null { return this.props.disposalDate; }
  get requestedAt(): Date { return this.props.requestedAt; }
  get approvedAt(): Date | null { return this.props.approvedAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isResolved(): boolean {
    return TERMINAL_DISPOSAL_STATUSES.includes(this.props.status);
  }

  approve(input: {
    approverUserId: string;
    signature: ApproverSignature;
    disposalDate: Date;
    witnessUserId?: string | null;
    approvalNotes?: string | null;
    now?: Date;
  }): void {
    if (this.isResolved()) {
      throw new DisposalAlreadyResolvedError(this.props.id, this.props.status);
    }
    if (input.approverUserId === this.props.requestedByUserId) {
      throw new DisposalRequesterCannotApproveError();
    }
    const now = input.now ?? new Date();
    this.props.status = 'Approved';
    this.props.approvedByUserId = input.approverUserId;
    this.props.signatureName = input.signature.printedName;
    this.props.signatureIp = input.signature.ip;
    this.props.disposalDate = input.disposalDate;
    this.props.witnessUserId = input.witnessUserId ?? null;
    this.props.approvalNotes = input.approvalNotes?.trim() || null;
    this.props.approvedAt = now;
    this.props.updatedAt = now;
  }

  reject(input: {
    approverUserId: string;
    rejectionReason: string;
    now?: Date;
  }): void {
    if (this.isResolved()) {
      throw new DisposalAlreadyResolvedError(this.props.id, this.props.status);
    }
    if (input.approverUserId === this.props.requestedByUserId) {
      throw new DisposalRequesterCannotApproveError();
    }
    const reason = input.rejectionReason?.trim();
    if (!reason) {
      throw new DisposalRejectionReasonRequiredError();
    }
    const now = input.now ?? new Date();
    this.props.status = 'Rejected';
    this.props.approvedByUserId = input.approverUserId;
    this.props.rejectionReason = reason;
    this.props.approvedAt = now;
    this.props.updatedAt = now;
  }

  toPersistence(): DisposalRecordProps {
    return {
      ...this.props,
      evidenceUrls: [...this.props.evidenceUrls],
      photoUrls: [...this.props.photoUrls],
    };
  }
}
