import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOrmEntity } from './infrastructure/typeorm-entities/notification.orm-entity';
import { TypeOrmNotificationRepository } from './infrastructure/repositories/typeorm-notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { NOTIFICATION_CHANNELS } from './domain/ports/notification-channel.port';
import { EmailNotificationChannel } from './infrastructure/channels/email.channel';
import { NotificationService } from './application/notification.service';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-read.use-case';
import { NotificationEventHandler } from './application/handlers/notification-event.handler';
import { NotificationController } from './presentation/notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationOrmEntity])],
  controllers: [NotificationController],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (email: EmailNotificationChannel) => [email],
      inject: [EmailNotificationChannel],
    },
    EmailNotificationChannel,
    NotificationService,
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    NotificationEventHandler,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
