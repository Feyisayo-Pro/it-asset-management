import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'asset_status_history' })
export class AssetStatusHistoryOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'from_status' })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'to_status' })
  toStatus!: string;

  @Column({ type: 'uuid', nullable: true, name: 'changed_by_user_id' })
  changedByUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;
}
