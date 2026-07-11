import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'workflow_instances' })
export class WorkflowInstanceOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId!: string;

  @Column({ type: 'varchar', length: 64, name: 'subject_type' })
  subjectType!: string;

  @Column({ type: 'varchar', length: 64, name: 'subject_id' })
  subjectId!: string;

  @Column({ type: 'varchar', length: 64, name: 'current_state' })
  currentState!: string;

  @Column({ type: 'uuid', nullable: true, name: 'started_by_user_id' })
  startedByUserId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', name: 'current_stage_entered_at' })
  currentStageEnteredAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  bypassed!: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'bypassed_by_user_id' })
  bypassedByUserId!: string | null;

  @Column({ type: 'text', nullable: true, name: 'bypass_reason' })
  bypassReason!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
