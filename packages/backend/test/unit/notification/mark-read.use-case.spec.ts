import {
  MarkNotificationReadUseCase,
  NotificationNotFoundError,
  NotificationAccessDeniedError,
} from '../../../src/modules/notification/application/use-cases/mark-read.use-case';
import { Notification } from '../../../src/modules/notification/domain/entities/notification.entity';
import {
  NotificationRepository,
  ListNotificationsParams,
  ListNotificationsResult,
} from '../../../src/modules/notification/domain/repositories/notification.repository';
import {
  NotificationChannel,
  NotificationEventType,
} from '../../../src/modules/notification/domain/enums/notification.enums';

class FakeRepo implements NotificationRepository {
  items: Notification[] = [];
  async findById(id: string) {
    return this.items.find((n) => n.id === id) ?? null;
  }
  async save(n: Notification) {
    const idx = this.items.findIndex((i) => i.id === n.id);
    if (idx >= 0) this.items[idx] = n;
    else this.items.push(n);
  }
  async list(_p: ListNotificationsParams): Promise<ListNotificationsResult> {
    return { data: [], page: 1, pageSize: 20, total: 0 };
  }
  async countUnread() { return 0; }
  async markAllRead() { return 0; }
}

describe('MarkNotificationReadUseCase', () => {
  let repo: FakeRepo;
  let uc: MarkNotificationReadUseCase;

  beforeEach(() => {
    repo = new FakeRepo();
    uc = new MarkNotificationReadUseCase(repo);
  });

  const makeNotification = (recipientUserId: string) =>
    Notification.create({
      id: 'n-1',
      recipientUserId,
      channel: NotificationChannel.InApp,
      eventType: NotificationEventType.AllocationApproved,
      subject: 'Test',
      message: 'Test message',
    });

  it('marks own notification as read', async () => {
    const n = makeNotification('user-1');
    repo.items.push(n);
    await uc.markOne('n-1', 'user-1');
    expect(repo.items[0].read).toBe(true);
  });

  it('throws NotificationNotFoundError for missing ID', async () => {
    await expect(uc.markOne('missing', 'user-1')).rejects.toThrow(
      NotificationNotFoundError,
    );
  });

  it('throws NotificationAccessDeniedError for other user', async () => {
    const n = makeNotification('user-1');
    repo.items.push(n);
    await expect(uc.markOne('n-1', 'user-2')).rejects.toThrow(
      NotificationAccessDeniedError,
    );
  });
});
