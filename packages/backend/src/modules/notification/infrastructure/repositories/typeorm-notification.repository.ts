import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../domain/entities/notification.entity';
import {
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';
import { NotificationChannel, NotificationEventType } from '../../domain/enums/notification.enums';
import { NotificationOrmEntity } from '../typeorm-entities/notification.orm-entity';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repo: Repository<NotificationOrmEntity>,
  ) {}

  async findById(id: string): Promise<Notification | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(notification: Notification): Promise<void> {
    await this.repo.save({
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      channel: notification.channel,
      eventType: notification.eventType,
      subject: notification.subject,
      message: notification.message,
      metadata: notification.metadata,
      read: notification.read,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    });
  }

  async list(params: ListNotificationsParams): Promise<ListNotificationsResult> {
    const qb = this.repo.createQueryBuilder('n');
    qb.where('n.recipient_user_id = :recipientUserId', {
      recipientUserId: params.recipientUserId,
    });
    if (params.unreadOnly) {
      qb.andWhere('n.read = false');
    }
    if (params.eventType) {
      qb.andWhere('n.event_type = :eventType', { eventType: params.eventType });
    }
    qb.orderBy('n.created_at', 'DESC');
    qb.skip((params.page - 1) * params.pageSize).take(params.pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) => this.toDomain(r)),
      page: params.page,
      pageSize: params.pageSize,
      total,
    };
  }

  async countUnread(recipientUserId: string): Promise<number> {
    return this.repo.count({
      where: { recipientUserId, read: false },
    });
  }

  async markAllRead(recipientUserId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update()
      .set({ read: true, readAt: new Date() })
      .where('recipient_user_id = :recipientUserId AND read = false', {
        recipientUserId,
      })
      .execute();
    return result.affected ?? 0;
  }

  private toDomain(row: NotificationOrmEntity): Notification {
    return Notification.reconstitute({
      id: row.id,
      recipientUserId: row.recipientUserId,
      channel: row.channel as NotificationChannel,
      eventType: row.eventType as NotificationEventType,
      subject: row.subject,
      message: row.message,
      metadata: row.metadata,
      read: row.read,
      readAt: row.readAt,
      createdAt: row.createdAt,
    });
  }
}
