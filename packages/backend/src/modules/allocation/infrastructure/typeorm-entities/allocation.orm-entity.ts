import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeOrmEntity } from '../../../employee/infrastructure/typeorm-entities/employee.orm-entity';
import { AssetOrmEntity } from '../../../asset/infrastructure/typeorm-entities/asset.orm-entity';

@Entity({ name: 'allocations' })
export class AllocationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => EmployeeOrmEntity, { nullable: false, eager: false })
  @JoinColumn({ name: 'employee_id' })
  employee?: EmployeeOrmEntity;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'asset_id' })
  assetId!: string | null;

  @ManyToOne(() => AssetOrmEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'asset_id' })
  asset?: AssetOrmEntity;

  @Column({ type: 'uuid', nullable: true, name: 'workflow_instance_id' })
  workflowInstanceId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, default: 'Requested', name: 'current_state' })
  currentState!: string;

  @Column({ type: 'text', nullable: true })
  justification!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'requested_by' })
  requestedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
