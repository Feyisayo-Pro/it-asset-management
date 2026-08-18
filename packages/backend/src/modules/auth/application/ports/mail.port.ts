export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

/**
 * MailService — abstract mail sender. NotificationModule will provide
 * the production implementation; AuthModule ships a logger-backed
 * default so password-reset emails still show up in dev without SMTP.
 */
export interface MailService {
  sendPasswordReset(input: {
    to: string;
    userId: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void>;
  sendPasswordChangedConfirmation(input: {
    to: string;
    userId: string;
    changedAt: Date;
  }): Promise<void>;
}
