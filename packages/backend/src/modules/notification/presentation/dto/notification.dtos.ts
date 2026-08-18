import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ALL_NOTIFICATION_EVENT_TYPES, NotificationEventType } from '../../domain/enums/notification.enums';

export class ListNotificationsQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(ALL_NOTIFICATION_EVENT_TYPES)
  eventType?: NotificationEventType;
}

export class NotificationResponseDto {
  id!: string;
  recipientUserId!: string;
  channel!: string;
  eventType!: string;
  subject!: string;
  message!: string;
  metadata!: Record<string, unknown>;
  read!: boolean;
  readAt!: string | null;
  createdAt!: string;
}

export class MarkReadResponseDto {
  @IsString()
  message!: string;

  @IsInt()
  count!: number;
}
