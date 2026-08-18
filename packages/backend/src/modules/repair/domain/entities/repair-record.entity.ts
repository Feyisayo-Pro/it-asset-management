import {
  RepairStatus,
  RepairStatusMachine,
} from '../value-objects/repair-enums';
import {
  RepairAlreadyTerminalError,
  RepairCompletionMissingDataError,
} from '../../../../common/errors/repair.errors';

export interface RepairStatusHistoryProps {
  id: string;
  repairId: string;
  fromStatus: RepairStatus | null;
  toStatus: RepairStatus;
  changedByUserId: string;
  note: string | null;
  occurredAt: Date;
}

export interface RepairRecordProps {
  id: string;
  assetId: string;
  employeeUserId: string | null;
  technicianUserId: string | null;
  vendor: string | null;
  reportedFault: string;
  diagnosis: string | null;
  resolutionNotes: string | null;
  status: RepairStatus;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  costCurrency: string;
  warrantyActiveAtIntake: boolean | null;
  reportedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RepairRecord aggregate root. The status transitions are guarded by
 * the RepairStatusMachine; asset-lifecycle side-effects (flipping the
 * asset back to Available, notifying stakeholders, escalating to
 * disposal) live in event handlers, not inside the aggregate.
 */
export class RepairRecord {
  private constructor(private props: RepairRecordProps) {}

  static hydrate(props: RepairRecordProps): RepairRecord {
    return new RepairRecord(props);
  }

  static open(input: {
    id: string;
    assetId: string;
    employeeUserId: string | null;
    reportedFault: string;
    createdByUserId: string;
    technicianUserId?: string | null;
    vendor?: string | null;
    estimatedCostCents?: number | null;
    costCurrency?: string;
    warrantyActiveAtIntake?: boolean | null;
    now?: Date;
  }): RepairRecord {
    if (!input.reportedFault?.trim()) {
      throw new RepairCompletionMissingDataError('reportedFault is required');
    }
    const now = input.now ?? new Date();
    return new RepairRecord({
      id: input.id,
      assetId: input.assetId,
      employeeUserId: input.employeeUserId,
      technicianUserId: input.technicianUserId ?? null,
      vendor: input.vendor?.trim() || null,
      reportedFault: input.reportedFault.trim(),
      diagnosis: null,
      resolutionNotes: null,
      status: 'Pending',
      estimatedCostCents: input.estimatedCostCents ?? null,
      actualCostCents: null,
      costCurrency: (input.costCurrency ?? 'USD').toUpperCase(),
      warrantyActiveAtIntake: input.warrantyActiveAtIntake ?? null,
      reportedAt: now,
      startedAt: null,
      completedAt: null,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get assetId(): string { return this.props.assetId; }
  get employeeUserId(): string | null { return this.props.employeeUserId; }
  get technicianUserId(): string | null { return this.props.technicianUserId; }
  get vendor(): string | null { return this.props.vendor; }
  get reportedFault(): string { return this.props.reportedFault; }
  get diagnosis(): string | null { return this.props.diagnosis; }
  get resolutionNotes(): string | null { return this.props.resolutionNotes; }
  get status(): RepairStatus { return this.props.status; }
  get estimatedCostCents(): number | null { return this.props.estimatedCostCents; }
  get actualCostCents(): number | null { return this.props.actualCostCents; }
  get costCurrency(): string { return this.props.costCurrency; }
  get warrantyActiveAtIntake(): boolean | null { return this.props.warrantyActiveAtIntake; }
  get reportedAt(): Date { return this.props.reportedAt; }
  get startedAt(): Date | null { return this.props.startedAt; }
  get completedAt(): Date | null { return this.props.completedAt; }
  get createdByUserId(): string { return this.props.createdByUserId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isTerminal(): boolean {
    return RepairStatusMachine.isTerminal(this.props.status);
  }

  assign(input: {
    technicianUserId?: string | null;
    vendor?: string | null;
    estimatedCostCents?: number | null;
    now: Date;
  }): void {
    if (this.isTerminal()) throw new RepairAlreadyTerminalError(this.props.id);
    if (input.technicianUserId !== undefined) {
      this.props.technicianUserId = input.technicianUserId;
    }
    if (input.vendor !== undefined) this.props.vendor = input.vendor?.trim() || null;
    if (input.estimatedCostCents !== undefined) {
      this.props.estimatedCostCents = input.estimatedCostCents;
    }
    this.props.updatedAt = input.now;
  }

  transition(input: {
    to: RepairStatus;
    diagnosis?: string | null;
    resolutionNotes?: string | null;
    actualCostCents?: number | null;
    now: Date;
  }): void {
    if (this.isTerminal()) throw new RepairAlreadyTerminalError(this.props.id);
    RepairStatusMachine.assertAllowed(this.props.status, input.to);

    // Terminal Completed requires resolution notes + actual cost so the
    // history record has enough context for future warranty claims.
    if (input.to === 'Completed') {
      const notes = input.resolutionNotes ?? this.props.resolutionNotes;
      if (!notes?.trim()) {
        throw new RepairCompletionMissingDataError(
          'resolutionNotes are required to mark Completed',
        );
      }
      const cost = input.actualCostCents ?? this.props.actualCostCents;
      if (cost == null) {
        throw new RepairCompletionMissingDataError(
          'actualCostCents is required to mark Completed',
        );
      }
    }

    if (input.diagnosis !== undefined) {
      this.props.diagnosis = input.diagnosis?.trim() || null;
    }
    if (input.resolutionNotes !== undefined) {
      this.props.resolutionNotes = input.resolutionNotes?.trim() || null;
    }
    if (input.actualCostCents !== undefined) {
      this.props.actualCostCents = input.actualCostCents;
    }
    if (this.props.startedAt === null && input.to !== 'Pending') {
      this.props.startedAt = input.now;
    }
    if (RepairStatusMachine.isTerminal(input.to)) {
      this.props.completedAt = input.now;
    }
    this.props.status = input.to;
    this.props.updatedAt = input.now;
  }

  toPersistence(): RepairRecordProps {
    return { ...this.props };
  }
}
