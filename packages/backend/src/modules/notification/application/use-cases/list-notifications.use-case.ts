import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
  ) {}

  execute(params: ListNotificationsParams): Promise<ListNotificationsResult> {
    return this.repo.list(params);
  }

  countUnread(recipientUserId: string): Promise<number> {
    return this.repo.countUnread(recipientUserId);
  }
}
