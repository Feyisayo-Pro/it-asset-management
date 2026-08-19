import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'assets' })
export class AssetOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('uq_assets_asset_tag', { unique: true })
  @Column({ type: 'varchar', length: 64, name: 'asset_tag' })
  assetTag!: string;

  @Column({ type: 'varchar', length: 64, name: 'device_type' })
  deviceType!: string;

  @Column({ type: 'varchar', length: 128 })
  brand!: string;

  @Column({ type: 'varchar', length: 128 })
  model!: string;

  @Index('uq_assets_serial_number', { unique: true })
  @Column({ type: 'varchar', length: 128, name: 'serial_number' })
  serialNumber!: string;

  @Index('uq_assets_imei_notnull', { unique: true, where: '"imei" IS NOT NULL' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  imei!: string | null;

  @Column({ type: 'date', nullable: true, name: 'purchase_date' })
  purchaseDate!: Date | null;

  @Column({ type: 'bigint', nullable: true, name: 'purchase_amount_cents' })
  purchaseAmountCents!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD', name: 'purchase_currency' })
  purchaseCurrency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor!: string | null;

  @Column({ type: 'date', nullable: true, name: 'warranty_expiry' })
  warrantyExpiry!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'office_location' })
  officeLocation!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'assigned_employee_name' })
  assignedEmployeeName!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'current_holder_id' })
  currentHolderId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'Registration' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
