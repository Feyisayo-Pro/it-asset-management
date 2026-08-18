import { NotificationService, SendNotificationInput } from '../../../src/modules/notification/application/notification.service';
import { Notification } from '../../../src/modules/notification/domain/entities/notification.entity';
import {
  NotificationRepository,
  ListNotificationsParams,
  ListNotificationsResult,
} from '../../../src/modules/notification/domain/repositories/notification.repository';
import {
  NotificationChannelPort,
  NotificationRecipient,
} from '../../../src/modules/notification/domain/ports/notification-channel.port';
import {
  NotificationChannel,
  NotificationEventType,
} from '../../../src/modules/notification/domain/enums/notification.enums';

class FakeNotificationRepo implements NotificationRepository {
  saved: Notification[] = [];
  async findById(id: string) {
    return this.saved.find((n) => n.id === id) ?? null;
  }
  async save(n: Notification) {
    this.saved.push(n);
  }
  async list(_params: ListNotificationsParams): Promise<ListNotificationsResult> {
    return { data: [], page: 1, pageSize: 20, total: 0 };
  }
  async countUnread() {
    return 0;
  }
  async markAllRead() {
    return 0;
  }
}

class FakeEmailChannel implements NotificationChannelPort {
  readonly channel = NotificationChannel.Email;
  sent: Array<{ recipient: NotificationRecipient; subject: string }> = [];
  async send(recipient: NotificationRecipient, subject: string) {
    this.sent.push({ recipient, subject });
  }
}

describe('NotificationService', () => {
  let repo: FakeNotificationRepo;
  let emailChannel: FakeEmailChannel;
  let service: NotificationService;

  beforeEach(() => {
    repo = new FakeNotificationRepo();
    emailChannel = new FakeEmailChannel();
    service = new NotificationService(repo, [emailChannel]);
  });

  const baseInput: SendNotificationInput = {
    recipientUserId: 'user-1',
    recipientEmail: 'user@example.com',
    eventType: NotificationEventType.AllocationApproved,
    subject: 'Approved',
    message: 'Your allocation was approved.',
  };

  it('saves an in-app notification by default', async () => {
    await service.send(baseInput);
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].recipientUserId).toBe('user-1');
    expect(repo.saved[0].subject).toBe('Approved');
  });

  it('dispatches to email channel by default', async () => {
    await service.send(baseInput);
    expect(emailChannel.sent).toHaveLength(1);
    expect(emailChannel.sent[0].recipient.email).toBe('user@example.com');
  });

  it('skips email when only IN_APP channel requested', async () => {
    await service.send({
      ...baseInput,
      channels: [NotificationChannel.InApp],
    });
    expect(repo.saved).toHaveLength(1);
    expect(emailChannel.sent).toHaveLength(0);
  });

  it('sendToMany creates notifications for all recipients', async () => {
    await service.sendToMany(
      [
        { userId: 'u1', email: 'a@b.com' },
        { userId: 'u2', email: 'c@d.com' },
      ],
      NotificationEventType.RepairRequested,
      'Repair',
      'New repair opened',
    );
    expect(repo.saved).toHaveLength(2);
    expect(emailChannel.sent).toHaveLength(2);
  });

  it('swallows errors from channels without throwing', async () => {
    const failingChannel: NotificationChannelPort = {
      channel: NotificationChannel.Email,
      send: async () => {
        throw new Error('SMTP down');
      },
    };
    const svc = new NotificationService(repo, [failingChannel]);
    await expect(svc.send(baseInput)).resolves.toBeUndefined();
    expect(repo.saved).toHaveLength(1);
  });
});
