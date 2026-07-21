import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VendorOrmEntity } from '../../../vendor/infrastructure/typeorm-entities/vendor.orm-entity';
import { AssetOrmEntity } from '../../../asset/infrastructure/typeorm-entities/asset.orm-entity';

@Entity({ name: 'acquisitions' })
export class AcquisitionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'vendor_id' })
  vendorId!: string | null;

  @ManyToOne(() => VendorOrmEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: VendorOrmEntity;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'invoice_number' })
  invoiceNumber!: string | null;

  @Index()
  @Column({ type: 'date', nullable: true, name: 'purchase_date' })
  purchaseDate!: Date | null;

  @Column({ type: 'int', nullable: true, name: 'warranty_months' })
  warrantyMonths!: number | null;

  @Column({ type: 'bigint', nullable: true, name: 'unit_cost_cents' })
  unitCostCents!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy!: string | null;

  @ManyToMany(() => AssetOrmEntity, { eager: false })
  @JoinTable({
    name: 'acquisition_assets',
    joinColumn: { name: 'acquisition_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' },
  })
  assets?: AssetOrmEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
