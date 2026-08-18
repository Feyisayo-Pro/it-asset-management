import {
  Column,
  Entity,
  Index,
  ManyToMany,
  JoinTable,
  PrimaryColumn,
} from 'typeorm';
import { PermissionOrmEntity } from './permission.orm-entity';

@Entity({ name: 'roles' })
export class RoleOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @ManyToMany(() => PermissionOrmEntity, { eager: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionOrmEntity[];
}
