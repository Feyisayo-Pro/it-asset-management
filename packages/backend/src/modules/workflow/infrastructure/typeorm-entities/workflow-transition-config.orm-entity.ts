import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'workflow_transitions_config' })
export class WorkflowTransitionConfigOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId!: string;

  @Column({ type: 'varchar', length: 64, name: 'from_state' })
  fromState!: string;

  @Column({ type: 'varchar', length: 64, name: 'to_state' })
  toState!: string;

  @Column({ type: 'varchar', length: 64, name: 'action_name' })
  actionName!: string;

  @Column({ type: 'jsonb', name: 'required_roles', default: () => "'[]'::jsonb" })
  requiredRoles!: string[];

  @Column({ type: 'boolean', default: false, name: 'requires_signature' })
  requiresSignature!: boolean;

  @Column({ type: 'boolean', default: false, name: 'requires_evidence' })
  requiresEvidence!: boolean;

  @Column({ type: 'boolean', default: false, name: 'requires_comment' })
  requiresComment!: boolean;

  @Column({ type: 'jsonb', name: 'notification_recipients', default: () => "'[]'::jsonb" })
  notificationRecipients!: string[];

  @Column({ type: 'varchar', length: 128, name: 'audit_action' })
  auditAction!: string;
}
