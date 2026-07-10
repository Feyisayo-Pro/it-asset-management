import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import {
  PasswordResetToken,
  PasswordResetTokenProps,
} from '../../domain/entities/password-reset-token.entity';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetTokenOrmEntity } from '../typeorm-entities/password-reset-token.orm-entity';

@Injectable()
export class TypeOrmPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  constructor(
    @InjectRepository(PasswordResetTokenOrmEntity)
    private readonly repo: Repository<PasswordResetTokenOrmEntity>,
  ) {}

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.repo.findOne({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async save(token: PasswordResetToken): Promise<PasswordResetToken> {
    const row = this.toRow(token.toPersistence());
    await this.repo.upsert(row, ['id']);
    return token;
  }

  async invalidateAllForUser(userId: string, now: Date): Promise<void> {
    await this.repo.update({ userId, usedAt: IsNull() }, { usedAt: now });
  }

  async deleteExpiredBefore(threshold: Date): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(threshold) });
    return result.affected ?? 0;
  }

  private toDomain(row: PasswordResetTokenOrmEntity): PasswordResetToken {
    return PasswordResetToken.hydrate({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      usedAt: row.usedAt,
    });
  }

  private toRow(props: PasswordResetTokenProps): PasswordResetTokenOrmEntity {
    const row = new PasswordResetTokenOrmEntity();
    row.id = props.id;
    row.userId = props.userId;
    row.tokenHash = props.tokenHash;
    row.expiresAt = props.expiresAt;
    row.createdAt = props.createdAt;
    row.usedAt = props.usedAt;
    return row;
  }
}
