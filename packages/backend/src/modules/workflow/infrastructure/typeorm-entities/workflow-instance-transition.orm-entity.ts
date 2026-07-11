import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'workflow_instance_transitions' })
export class WorkflowInstanceTransitionOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'instance_id' })
  instanceId!: string;

  @Column({ type: 'varchar', length: 64, name: 'from_state' })
  fromState!: string;

  @Column({ type: 'varchar', length: 64, name: 'to_state' })
  toState!: string;

  @Column({ type: 'varchar', length: 64, name: 'action_name' })
  actionName!: string;

  @Column({ type: 'uuid', nullable: true, name: 'actor_user_id' })
  actorUserId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'signature_name' })
  signatureName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'signature_ip' })
  signatureIp!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'evidence_file_ids' })
  evidenceFileIds!: string[] | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;
}
