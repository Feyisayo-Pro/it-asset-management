import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'repair_records' })
export class RepairRecordOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'employee_user_id' })
  employeeUserId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'technician_user_id' })
  technicianUserId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor!: string | null;

  @Column({ type: 'text', name: 'reported_fault' })
  reportedFault!: string;

  @Column({ type: 'text', nullable: true })
  diagnosis!: string | null;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolutionNotes!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'Pending' })
  status!: string;

  @Column({ type: 'bigint', nullable: true, name: 'estimated_cost_cents' })
  estimatedCostCents!: string | null;

  @Column({ type: 'bigint', nullable: true, name: 'actual_cost_cents' })
  actualCostCents!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD', name: 'cost_currency' })
  costCurrency!: string;

  @Column({ type: 'boolean', nullable: true, name: 'warranty_active_at_intake' })
  warrantyActiveAtIntake!: boolean | null;

  @Column({ type: 'timestamptz', name: 'reported_at' })
  reportedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'repair_status_history' })
export class RepairStatusHistoryOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'repair_id' })
  repairId!: string;

  @Column({ type: 'varchar', length: 24, nullable: true, name: 'from_status' })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 24, name: 'to_status' })
  toStatus!: string;

  @Column({ type: 'uuid', name: 'changed_by_user_id' })
  changedByUserId!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;
}
