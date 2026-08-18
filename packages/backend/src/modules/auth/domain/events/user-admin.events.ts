import { DomainEvent } from '../../../../common/events/base-event';

export interface UserCreatedByAdminPayload {
  userId: string;
  email: string;
  roleId: string;
  createdByUserId: string;
}
export class UserCreatedByAdminEvent extends DomainEvent<UserCreatedByAdminPayload> {
  readonly name = 'auth.admin.user.created';
}

export interface UserUpdatedByAdminPayload {
  userId: string;
  updatedByUserId: string;
  changedFields: string[];
}
export class UserUpdatedByAdminEvent extends DomainEvent<UserUpdatedByAdminPayload> {
  readonly name = 'auth.admin.user.updated';
}

export interface UserRoleChangedPayload {
  userId: string;
  fromRoleId: string;
  toRoleId: string;
  changedByUserId: string;
}
export class UserRoleChangedEvent extends DomainEvent<UserRoleChangedPayload> {
  readonly name = 'auth.admin.user.role-changed';
}

export interface UserActivatedPayload {
  userId: string;
  activatedByUserId: string;
}
export class UserActivatedEvent extends DomainEvent<UserActivatedPayload> {
  readonly name = 'auth.admin.user.activated';
}

export interface UserDeactivatedPayload {
  userId: string;
  deactivatedByUserId: string;
}
export class UserDeactivatedEvent extends DomainEvent<UserDeactivatedPayload> {
  readonly name = 'auth.admin.user.deactivated';
}
