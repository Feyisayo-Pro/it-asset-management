import { Notification } from '../../../src/modules/notification/domain/entities/notification.entity';
import { NotificationChannel, NotificationEventType } from '../../../src/modules/notification/domain/enums/notification.enums';

describe('Notification entity', () => {
  const baseInput = {
    id: '00000000-0000-0000-0000-000000000001',
    recipientUserId: '00000000-0000-0000-0000-000000000002',
    channel: NotificationChannel.InApp,
    eventType: NotificationEventType.AllocationApproved,
    subject: 'Allocation Approved',
    message: 'Your allocation has been approved.',
  };

  it('creates with default read=false and readAt=null', () => {
    const n = Notification.create(baseInput);
    expect(n.id).toBe(baseInput.id);
    expect(n.read).toBe(false);
    expect(n.readAt).toBeNull();
    expect(n.channel).toBe('IN_APP');
    expect(n.eventType).toBe('ALLOCATION_APPROVED');
  });

  it('stores metadata when provided', () => {
    const n = Notification.create({
      ...baseInput,
      metadata: { assetId: 'abc' },
    });
    expect(n.metadata).toEqual({ assetId: 'abc' });
  });

  it('defaults metadata to empty object', () => {
    const n = Notification.create(baseInput);
    expect(n.metadata).toEqual({});
  });

  it('markAsRead sets read and readAt', () => {
    const n = Notification.create(baseInput);
    n.markAsRead();
    expect(n.read).toBe(true);
    expect(n.readAt).toBeInstanceOf(Date);
  });

  it('markAsRead is idempotent', () => {
    const n = Notification.create(baseInput);
    n.markAsRead();
    const firstReadAt = n.readAt;
    n.markAsRead();
    expect(n.readAt).toBe(firstReadAt);
  });

  it('reconstitutes from persisted data', () => {
    const now = new Date();
    const n = Notification.reconstitute({
      id: baseInput.id,
      recipientUserId: baseInput.recipientUserId,
      channel: NotificationChannel.Email,
      eventType: NotificationEventType.RepairCompleted,
      subject: 'Repair Done',
      message: 'Your repair is complete.',
      metadata: { repairId: 'xyz' },
      read: true,
      readAt: now,
      createdAt: now,
    });
    expect(n.read).toBe(true);
    expect(n.readAt).toBe(now);
    expect(n.channel).toBe('EMAIL');
  });
});
