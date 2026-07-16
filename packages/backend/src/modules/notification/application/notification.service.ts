import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Notification } from '../domain/entities/notification.entity';
import {
  NotificationChannel,
  NotificationEventType,
} from '../domain/enums/notification.enums';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../domain/repositories/notification.repository';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannelPort,
  NotificationRecipient,
} from '../domain/ports/notification-channel.port';

export interface SendNotificationInput {
  recipientUserId: string;
  recipientEmail?: string;
  eventType: NotificationEventType;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');
  private readonly channelMap: Map<NotificationChannel, NotificationChannelPort>;

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepository,
    @Inject(NOTIFICATION_CHANNELS)
    channels: NotificationChannelPort[],
  ) {
    this.channelMap = new Map(channels.map((c) => [c.channel, c]));
  }

  async send(input: SendNotificationInput): Promise<void> {
    const channels = input.channels ?? [
      NotificationChannel.InApp,
      NotificationChannel.Email,
    ];

    const notification = Notification.create({
      id: uuidv4(),
      recipientUserId: input.recipientUserId,
      channel: NotificationChannel.InApp,
      eventType: input.eventType,
      subject: input.subject,
      message: input.message,
      metadata: input.metadata,
    });

    if (channels.includes(NotificationChannel.InApp)) {
      try {
        await this.repo.save(notification);
      } catch (err) {
        this.logger.error(
          `Failed to save in-app notification: ${(err as Error).message}`,
        );
      }
    }

    const recipient: NotificationRecipient = {
      userId: input.recipientUserId,
      email: input.recipientEmail ?? '',
    };

    for (const ch of channels) {
      if (ch === NotificationChannel.InApp) continue;
      const channel = this.channelMap.get(ch);
      if (!channel) continue;
      try {
        await channel.send(recipient, input.subject, input.message, input.metadata);
      } catch (err) {
        this.logger.error(
          `Failed to send ${ch} notification: ${(err as Error).message}`,
        );
      }
    }
  }

  async sendToMany(
    recipients: Array<{ userId: string; email?: string }>,
    eventType: NotificationEventType,
    subject: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    for (const r of recipients) {
      await this.send({
        recipientUserId: r.userId,
        recipientEmail: r.email,
        eventType,
        subject,
        message,
        metadata,
      });
    }
  }
}
