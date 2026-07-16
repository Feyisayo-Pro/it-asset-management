import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'assessment_templates' })
export class AssessmentTemplateOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

@Entity({ name: 'assessment_template_items' })
export class AssessmentTemplateItemOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'template_id' })
  templateId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: string;

  @Column({ type: 'boolean', default: true })
  required!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;
}

@Entity({ name: 'assessment_records' })
export class AssessmentRecordOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'template_id' })
  templateId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'varchar', length: 32, default: 'Standalone', name: 'context_type' })
  contextType!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'context_id' })
  contextId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'Draft' })
  status!: string;

  @Column({ type: 'uuid', name: 'technician_user_id' })
  technicianUserId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  outcome!: string | null;

  @Column({ type: 'text', nullable: true })
  findings!: string | null;

  @Column({ type: 'text', nullable: true })
  recommendations!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'photo_urls' })
  photoUrls!: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'signature_name' })
  signatureName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'signature_ip' })
  signatureIp!: string | null;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'assessment_item_results' })
export class AssessmentItemResultOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'record_id' })
  recordId!: string;

  @Column({ type: 'varchar', length: 64, name: 'item_code' })
  itemCode!: string;

  @Column({ type: 'varchar', length: 8 })
  result!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
