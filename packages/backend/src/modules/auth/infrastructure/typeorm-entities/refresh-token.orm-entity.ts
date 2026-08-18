import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenOrmEntity {
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

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'replaced_by_id' })
  replacedById!: string | null;
}
