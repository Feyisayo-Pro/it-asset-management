import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'employees' })
export class EmployeeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, name: 'employee_code' })
  employeeCode!: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 128 })
  department!: string;

  @Column({ type: 'varchar', length: 100 })
  designation!: string;

  @Column({ type: 'uuid', nullable: true, name: 'manager_id' })
  managerId!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'office_location' })
  officeLocation!: string;

  @Column({ type: 'date', name: 'hire_date' })
  hireDate!: Date;

  @Column({ type: 'varchar', length: 32, name: 'employment_status', default: 'active' })
  employmentStatus!: string;

  @Column({ type: 'date', nullable: true, name: 'termination_date' })
  terminationDate!: Date | null;

  @Index({ unique: true })
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
