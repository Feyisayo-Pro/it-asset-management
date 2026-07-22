import { DisposalRecord } from '../../domain/entities/disposal-record.entity';

const toDateStr = (v: Date | string): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

const toIso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

export const toDisposalDto = (r: DisposalRecord) => ({
  id: r.id,
  assetId: r.assetId,
  requestedByUserId: r.requestedByUserId,
  approvedByUserId: r.approvedByUserId,
  witnessUserId: r.witnessUserId,
  reason: r.reason,
  method: r.method,
  status: r.status,
  requestNotes: r.requestNotes,
  approvalNotes: r.approvalNotes,
  rejectionReason: r.rejectionReason,
  signatureName: r.signatureName,
  signatureIp: r.signatureIp,
  evidenceUrls: r.evidenceUrls,
  photoUrls: r.photoUrls,
  disposalDate: r.disposalDate ? toDateStr(r.disposalDate) : null,
  requestedAt: toIso(r.requestedAt),
  approvedAt: r.approvedAt ? toIso(r.approvedAt) : null,
  createdAt: toIso(r.createdAt),
  updatedAt: toIso(r.updatedAt),
});
