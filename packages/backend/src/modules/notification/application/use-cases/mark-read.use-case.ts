import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';
import { DomainError } from '../../../../common/errors/domain.error';

export class NotificationNotFoundError extends DomainError {
  readonly code = 'NOTIFICATION_NOT_FOUND';
  constructor(id: string) {
    super(`Notification ${id} not found`);
  }
}

export class NotificationAccessDeniedError extends DomainError {
  readonly code = 'NOTIFICATION_ACCESS_DENIED';
  constructor() {
    super('You can only mark your own notifications as read');
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  async markOne(id: string, userId: string): Promise<void> {
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotificationNotFoundError(id);
    if (notification.recipientUserId !== userId) {
      throw new NotificationAccessDeniedError();
    }
    notification.markAsRead();
    await this.repo.save(notification);
  }

  markAll(userId: string): Promise<number> {
    return this.repo.markAllRead(userId);
  }
}
