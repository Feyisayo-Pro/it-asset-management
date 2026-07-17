import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ListNotificationsUseCase } from '../application/use-cases/list-notifications.use-case';
import { MarkNotificationReadUseCase } from '../application/use-cases/mark-read.use-case';
import { ListNotificationsQuery } from './dto/notification.dtos';
import { toNotificationDto } from './dto/notification.mapper';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly listUC: ListNotificationsUseCase,
    private readonly markReadUC: MarkNotificationReadUseCase,
  ) {}

  @Get()
  @RequirePermissions('notification:read')
  async list(
    @Query() query: ListNotificationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.listUC.execute({
      recipientUserId: user.id,
      page: query.page,
      pageSize: query.pageSize,
      unreadOnly: query.unreadOnly,
      eventType: query.eventType,
    });
    return {
      data: result.data.map(toNotificationDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get('unread-count')
  @RequirePermissions('notification:read')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.listUC.countUnread(user.id);
    return { count };
  }

  @Patch(':id/read')
  @RequirePermissions('notification:read')
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.markReadUC.markOne(id, user.id);
    return { message: 'Marked as read' };
  }

  @Post('mark-all-read')
  @RequirePermissions('notification:read')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.markReadUC.markAll(user.id);
    return { message: 'All notifications marked as read', count };
  }
}
