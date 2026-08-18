import { ApplicationError, DomainError } from './domain.error';

export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'AUTH_INVALID_CREDENTIALS';
  constructor() {
    super('Invalid credentials');
  }
}

export class AccountLockedError extends ApplicationError {
  readonly code = 'AUTH_ACCOUNT_LOCKED';
  constructor(unlockAt: Date) {
    super('Account temporarily locked', { unlockAt: unlockAt.toISOString() });
  }
}

export class AccountDisabledError extends ApplicationError {
  readonly code = 'AUTH_ACCOUNT_DISABLED';
  constructor() {
    super('Account disabled');
  }
}

export class InvalidRefreshTokenError extends ApplicationError {
  readonly code = 'AUTH_INVALID_REFRESH_TOKEN';
  constructor() {
    super('Invalid or expired refresh token');
  }
}

export class InvalidPasswordResetTokenError extends ApplicationError {
  readonly code = 'AUTH_INVALID_RESET_TOKEN';
  constructor() {
    super('Invalid or expired password reset token');
  }
}

export class WeakPasswordError extends DomainError {
  readonly code = 'AUTH_WEAK_PASSWORD';
  constructor(reason: string) {
    super(`Password does not meet policy: ${reason}`, { reason });
  }
}

export class SamePasswordError extends ApplicationError {
  readonly code = 'AUTH_SAME_PASSWORD';
  constructor() {
    super('New password must differ from the current password');
  }
}
