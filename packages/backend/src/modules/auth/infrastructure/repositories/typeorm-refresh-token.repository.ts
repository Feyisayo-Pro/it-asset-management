import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import {
  RefreshToken,
  RefreshTokenProps,
} from '../../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenOrmEntity } from '../typeorm-entities/refresh-token.orm-entity';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repo: Repository<RefreshTokenOrmEntity>,
  ) {}

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.repo.findOne({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    const row = this.toRow(token.toPersistence());
    await this.repo.upsert(row, ['id']);
    return token;
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: now },
    );
  }

  async deleteExpiredBefore(threshold: Date): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(threshold) });
    return result.affected ?? 0;
  }

  private toDomain(row: RefreshTokenOrmEntity): RefreshToken {
    return RefreshToken.hydrate({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      replacedById: row.replacedById,
    });
  }

  private toRow(props: RefreshTokenProps): RefreshTokenOrmEntity {
    const row = new RefreshTokenOrmEntity();
    row.id = props.id;
    row.userId = props.userId;
    row.tokenHash = props.tokenHash;
    row.expiresAt = props.expiresAt;
    row.createdAt = props.createdAt;
    row.revokedAt = props.revokedAt;
    row.replacedById = props.replacedById;
    return row;
  }
}
