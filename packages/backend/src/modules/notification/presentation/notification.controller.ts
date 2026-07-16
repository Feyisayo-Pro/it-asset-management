import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
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
  async list(@Query() query: ListNotificationsQuery, @Req() req: Request) {
    const userId = (req as unknown as { user: { sub: string } }).user.sub;
    const result = await this.listUC.execute({
      recipientUserId: userId,
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
  async unreadCount(@Req() req: Request) {
    const userId = (req as unknown as { user: { sub: string } }).user.sub;
    const count = await this.listUC.countUnread(userId);
    return { count };
  }

  @Patch(':id/read')
  @RequirePermissions('notification:read')
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const userId = (req as unknown as { user: { sub: string } }).user.sub;
    await this.markReadUC.markOne(id, userId);
    return { message: 'Marked as read' };
  }

  @Post('mark-all-read')
  @RequirePermissions('notification:read')
  async markAllRead(@Req() req: Request) {
    const userId = (req as unknown as { user: { sub: string } }).user.sub;
    const count = await this.markReadUC.markAll(userId);
    return { message: 'All notifications marked as read', count };
  }
}
