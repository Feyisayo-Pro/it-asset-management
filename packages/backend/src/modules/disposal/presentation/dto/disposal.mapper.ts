import { DisposalRecord } from '../../domain/entities/disposal-record.entity';

const toDateOnly = (d: Date | null): string | null => {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
};

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
  disposalDate: toDateOnly(r.disposalDate),
  requestedAt: r.requestedAt.toISOString(),
  approvedAt: r.approvedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
