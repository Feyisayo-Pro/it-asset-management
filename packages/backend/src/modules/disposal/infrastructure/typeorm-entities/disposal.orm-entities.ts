import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'disposal_records' })
export class DisposalRecordOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'uuid', name: 'requested_by_user_id' })
  requestedByUserId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by_user_id' })
  approvedByUserId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'witness_user_id' })
  witnessUserId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  reason!: string;

  @Column({ type: 'varchar', length: 32 })
  method!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'Requested' })
  status!: string;

  @Column({ type: 'text', nullable: true, name: 'request_notes' })
  requestNotes!: string | null;

  @Column({ type: 'text', nullable: true, name: 'approval_notes' })
  approvalNotes!: string | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'signature_name' })
  signatureName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'signature_ip' })
  signatureIp!: string | null;

  @Column({ type: 'jsonb', name: 'evidence_urls', default: () => `'[]'::jsonb` })
  evidenceUrls!: string[];

  @Column({ type: 'jsonb', name: 'photo_urls', default: () => `'[]'::jsonb` })
  photoUrls!: string[];

  @Column({ type: 'date', nullable: true, name: 'disposal_date' })
  disposalDate!: Date | string | null;

  @Column({ type: 'timestamptz', name: 'requested_at' })
  requestedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
