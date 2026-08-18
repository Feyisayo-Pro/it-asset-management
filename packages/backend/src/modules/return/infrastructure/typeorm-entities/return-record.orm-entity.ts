import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'return_records' })
export class ReturnRecordOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'holder_user_id' })
  holderUserId!: string | null;

  @Column({ type: 'uuid', name: 'initiated_by_user_id' })
  initiatedByUserId!: string;

  @Column({ type: 'varchar', length: 32 })
  reason!: string;

  @Column({ type: 'text', nullable: true, name: 'reason_notes' })
  reasonNotes!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'workflow_instance_id' })
  workflowInstanceId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, default: 'Initiated', name: 'current_state' })
  currentState!: string;

  @Column({ type: 'text', nullable: true })
  findings!: string | null;

  @Column({ type: 'text', nullable: true, name: 'damage_notes' })
  damageNotes!: string | null;

  @Column({ type: 'text', nullable: true, name: 'missing_accessories' })
  missingAccessories!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  outcome!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'photo_urls' })
  photoUrls!: string[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
