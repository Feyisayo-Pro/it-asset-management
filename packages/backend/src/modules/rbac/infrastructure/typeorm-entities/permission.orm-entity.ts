import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'permissions' })
export class PermissionOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;
}
