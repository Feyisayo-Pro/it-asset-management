import {
  NotificationChannel,
  NotificationEventType,
} from '../enums/notification.enums';

export interface CreateNotificationInput {
  id: string;
  recipientUserId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class Notification {
  readonly id: string;
  readonly recipientUserId: string;
  readonly channel: NotificationChannel;
  readonly eventType: NotificationEventType;
  readonly subject: string;
  readonly message: string;
  readonly metadata: Record<string, unknown>;
  read: boolean;
  readAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: {
    id: string;
    recipientUserId: string;
    channel: NotificationChannel;
    eventType: NotificationEventType;
    subject: string;
    message: string;
    metadata: Record<string, unknown>;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.recipientUserId = props.recipientUserId;
    this.channel = props.channel;
    this.eventType = props.eventType;
    this.subject = props.subject;
    this.message = props.message;
    this.metadata = props.metadata;
    this.read = props.read;
    this.readAt = props.readAt;
    this.createdAt = props.createdAt;
  }

  static create(input: CreateNotificationInput): Notification {
    return new Notification({
      id: input.id,
      recipientUserId: input.recipientUserId,
      channel: input.channel,
      eventType: input.eventType,
      subject: input.subject,
      message: input.message,
      metadata: input.metadata ?? {},
      read: false,
      readAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: {
    id: string;
    recipientUserId: string;
    channel: NotificationChannel;
    eventType: NotificationEventType;
    subject: string;
    message: string;
    metadata: Record<string, unknown>;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
  }): Notification {
    return new Notification(props);
  }

  markAsRead(): void {
    if (!this.read) {
      this.read = true;
      this.readAt = new Date();
    }
  }
}
