import { Notification } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface ListNotificationsParams {
  recipientUserId: string;
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  eventType?: string;
}

export interface ListNotificationsResult {
  data: Notification[];
  page: number;
  pageSize: number;
  total: number;
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  save(notification: Notification): Promise<void>;
  list(params: ListNotificationsParams): Promise<ListNotificationsResult>;
  countUnread(recipientUserId: string): Promise<number>;
  markAllRead(recipientUserId: string): Promise<number>;
}
