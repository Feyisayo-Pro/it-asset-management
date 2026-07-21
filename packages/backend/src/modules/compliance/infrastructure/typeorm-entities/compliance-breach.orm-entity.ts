import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'compliance_breaches' })
export class ComplianceBreachOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'workflow_instance_id' })
  workflowInstanceId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64, name: 'definition_key' })
  definitionKey!: string;

  @Column({ type: 'varchar', length: 64, name: 'subject_type' })
  subjectType!: string;

  @Column({ type: 'varchar', length: 64, name: 'subject_id' })
  subjectId!: string;

  @Column({ type: 'varchar', length: 64, name: 'breached_state' })
  breachedState!: string;

  @Column({ type: 'int', name: 'sla_minutes' })
  slaMinutes!: number;

  @Column({ type: 'timestamptz', name: 'entered_at' })
  enteredAt!: Date;

  @Column({ type: 'timestamptz', name: 'breached_at' })
  breachedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt!: Date | null;

  @Column({ type: 'boolean', default: false, name: 'escalation_sent' })
  escalationSent!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
