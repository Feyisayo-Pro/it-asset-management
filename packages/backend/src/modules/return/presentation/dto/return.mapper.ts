import { ReturnRecord } from '../../domain/entities/return-record.entity';

export const toReturnDto = (r: ReturnRecord) => ({
  id: r.id,
  assetId: r.assetId,
  holderUserId: r.holderUserId,
  initiatedByUserId: r.initiatedByUserId,
  reason: r.reason,
  reasonNotes: r.reasonNotes,
  workflowInstanceId: r.workflowInstanceId,
  currentState: r.currentState,
  findings: r.findings,
  damageNotes: r.damageNotes,
  missingAccessories: r.missingAccessories,
  outcome: r.outcome,
  photoUrls: r.photoUrls,
  items: r.items.map((i) => ({
    id: i.id,
    itemType: i.itemType,
    description: i.description,
    status: i.status,
    notes: i.notes,
  })),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
