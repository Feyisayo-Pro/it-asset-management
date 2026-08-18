import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'asset_accessories' })
export class AssetAccessoryOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'asset_id' })
  assetId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
