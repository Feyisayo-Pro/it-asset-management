import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../../domain/enums/notification.enums';
import {
  NotificationChannelPort,
  NotificationRecipient,
} from '../../domain/ports/notification-channel.port';

@Injectable()
export class EmailNotificationChannel implements NotificationChannelPort {
  readonly channel = NotificationChannel.Email;
  private readonly logger = new Logger('EmailNotificationChannel');

  async send(
    recipient: NotificationRecipient,
    subject: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!recipient.email) return;

    const html = buildEmailHtml(subject, message, metadata);
    this.logger.log(
      `notification-email → to=${recipient.email} subject="${subject}"`,
    );
    this.logger.debug(`email-body: ${html.slice(0, 200)}…`);
  }
}

function buildEmailHtml(
  subject: string,
  message: string,
  _metadata?: Record<string, unknown>,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1B73E8;color:#fff;padding:16px 24px;border-radius:6px 6px 0 0">
    <h2 style="margin:0;font-size:18px">IT Asset Management</h2>
  </div>
  <div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 6px 6px">
    <h3 style="margin:0 0 12px">${escapeHtml(subject)}</h3>
    <p style="line-height:1.6">${escapeHtml(message)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:12px;color:#888">
      This is an automated notification from the IAM Platform.
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
