import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'password_reset_tokens' })
export class PasswordResetTokenOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt!: Date | null;
}
