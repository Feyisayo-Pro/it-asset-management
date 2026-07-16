import { Notification } from '../../domain/entities/notification.entity';
import { NotificationResponseDto } from './notification.dtos';

export function toNotificationDto(n: Notification): NotificationResponseDto {
  return {
    id: n.id,
    recipientUserId: n.recipientUserId,
    channel: n.channel,
    eventType: n.eventType,
    subject: n.subject,
    message: n.message,
    metadata: n.metadata,
    read: n.read,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
