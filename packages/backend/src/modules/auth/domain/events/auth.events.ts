import { DomainEvent } from '../../../../common/events/base-event';

export interface UserLoggedInPayload {
  userId: string;
  email: string;
  ip: string | undefined;
  userAgent: string | undefined;
}
export class UserLoggedInEvent extends DomainEvent<UserLoggedInPayload> {
  readonly name = 'auth.user.logged-in';
}

export interface UserLoggedOutPayload {
  userId: string;
}
export class UserLoggedOutEvent extends DomainEvent<UserLoggedOutPayload> {
  readonly name = 'auth.user.logged-out';
}

export interface LoginFailedPayload {
  emailAttempted: string;
  reason: 'unknown_user' | 'bad_password' | 'locked' | 'disabled';
  ip: string | undefined;
}
export class LoginFailedEvent extends DomainEvent<LoginFailedPayload> {
  readonly name = 'auth.login.failed';
}

export interface AccountLockedPayload {
  userId: string;
  email: string;
  lockedUntil: Date;
}
export class AccountLockedEvent extends DomainEvent<AccountLockedPayload> {
  readonly name = 'auth.account.locked';
}

export interface PasswordChangedPayload {
  userId: string;
  email: string;
}
export class PasswordChangedEvent extends DomainEvent<PasswordChangedPayload> {
  readonly name = 'auth.password.changed';
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  rawToken: string;
  expiresAt: Date;
}
export class PasswordResetRequestedEvent extends DomainEvent<PasswordResetRequestedPayload> {
  readonly name = 'auth.password-reset.requested';
}

export interface PasswordResetCompletedPayload {
  userId: string;
  email: string;
}
export class PasswordResetCompletedEvent extends DomainEvent<PasswordResetCompletedPayload> {
  readonly name = 'auth.password-reset.completed';
}
