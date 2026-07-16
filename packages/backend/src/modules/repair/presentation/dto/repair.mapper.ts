import {
  RepairRecord,
  RepairStatusHistoryProps,
} from '../../domain/entities/repair-record.entity';

export const toRepairDto = (r: RepairRecord) => ({
  id: r.id,
  assetId: r.assetId,
  employeeUserId: r.employeeUserId,
  technicianUserId: r.technicianUserId,
  vendor: r.vendor,
  reportedFault: r.reportedFault,
  diagnosis: r.diagnosis,
  resolutionNotes: r.resolutionNotes,
  status: r.status,
  estimatedCost: r.estimatedCostCents == null ? null : r.estimatedCostCents / 100,
  actualCost: r.actualCostCents == null ? null : r.actualCostCents / 100,
  costCurrency: r.costCurrency,
  warrantyActiveAtIntake: r.warrantyActiveAtIntake,
  reportedAt: r.reportedAt.toISOString(),
  startedAt: r.startedAt?.toISOString() ?? null,
  completedAt: r.completedAt?.toISOString() ?? null,
  createdByUserId: r.createdByUserId,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const toRepairHistoryDto = (h: RepairStatusHistoryProps) => ({
  id: h.id,
  fromStatus: h.fromStatus,
  toStatus: h.toStatus,
  changedByUserId: h.changedByUserId,
  note: h.note,
  occurredAt: h.occurredAt.toISOString(),
});
