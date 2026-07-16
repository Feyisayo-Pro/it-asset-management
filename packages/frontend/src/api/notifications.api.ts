import { client } from './client';
import { PagedResponse } from '@/types/api';

export interface NotificationDto {
  id: string;
  recipientUserId: string;
  channel: string;
  eventType: string;
  subject: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  eventType?: string;
}

export const notificationsApi = {
  list: async (
    params: ListNotificationsParams,
  ): Promise<PagedResponse<NotificationDto>> => {
    const { data } = await client.get<PagedResponse<NotificationDto>>(
      '/notifications',
      { params },
    );
    return data;
  },
  unreadCount: async (): Promise<{ count: number }> => {
    const { data } = await client.get<{ count: number }>(
      '/notifications/unread-count',
    );
    return data;
  },
  markRead: async (id: string): Promise<void> => {
    await client.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<{ count: number }> => {
    const { data } = await client.post<{ count: number }>(
      '/notifications/mark-all-read',
    );
    return data;
  },
};
