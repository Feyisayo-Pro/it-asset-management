import { NotificationChannel } from '../enums/notification.enums';

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');

export interface NotificationRecipient {
  userId: string;
  email: string;
}

export interface NotificationChannelPort {
  readonly channel: NotificationChannel;
  send(
    recipient: NotificationRecipient,
    subject: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}
