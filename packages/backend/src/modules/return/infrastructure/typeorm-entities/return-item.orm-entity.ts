import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'return_items' })
export class ReturnItemOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'return_record_id' })
  returnRecordId!: string;

  @Column({ type: 'varchar', length: 32, name: 'item_type' })
  itemType!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
