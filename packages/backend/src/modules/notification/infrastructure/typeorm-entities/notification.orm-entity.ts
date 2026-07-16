import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('notifications')
export class NotificationOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
