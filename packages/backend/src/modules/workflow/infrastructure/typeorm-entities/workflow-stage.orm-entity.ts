import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'workflow_stages' })
export class WorkflowStageOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId!: string;

  @Column({ type: 'varchar', length: 64 })
  state!: string;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'jsonb', name: 'required_roles', default: () => "'[]'::jsonb" })
  requiredRoles!: string[];

  @Column({ type: 'int', nullable: true, name: 'sla_minutes' })
  slaMinutes!: number | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;
}
