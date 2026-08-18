import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../application/ports/mail.port';

/**
 * Default MailService that writes to the app logger. Non-production
 * only — production wiring will be replaced by NotificationModule's
 * real dispatcher (email + in-app) when it lands. Keeps the auth flow
 * fully exercisable without SMTP or MinIO.
 */
@Injectable()
export class LoggerMailService implements MailService {
  private readonly logger = new Logger('Mail');

  async sendPasswordReset(input: {
    to: string;
    userId: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    this.logger.log(
      `password-reset → to=${input.to} url=${input.resetUrl} expiresAt=${input.expiresAt.toISOString()}`,
    );
  }

  async sendPasswordChangedConfirmation(input: {
    to: string;
    userId: string;
    changedAt: Date;
  }): Promise<void> {
    this.logger.log(
      `password-changed-confirmation → to=${input.to} at=${input.changedAt.toISOString()}`,
    );
  }
}
