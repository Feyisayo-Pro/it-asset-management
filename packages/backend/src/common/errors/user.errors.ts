import { ApplicationError } from './domain.error';

export class UserNotFoundError extends ApplicationError {
  readonly code = 'USER_NOT_FOUND';
  constructor(userId: string) {
    super('User not found', { userId });
  }
}

export class EmailAlreadyExistsError extends ApplicationError {
  readonly code = 'DUPLICATE_EMAIL';
  constructor(email: string) {
    super('This email is already registered', { email });
  }
}

export class RoleNotFoundError extends ApplicationError {
  readonly code = 'ROLE_NOT_FOUND';
  constructor(roleId: string) {
    super('Role not found', { roleId });
  }
}

export class CannotDemoteLastAdminError extends ApplicationError {
  readonly code = 'CANNOT_DEMOTE_LAST_ADMIN';
  constructor() {
    super(
      'Cannot remove Super Admin role from the last administrator. Assign another Super Admin first.',
    );
  }
}

export class CannotDeactivateLastAdminError extends ApplicationError {
  readonly code = 'CANNOT_DEACTIVATE_LAST_ADMIN';
  constructor() {
    super(
      'Cannot deactivate the last active Super Admin. Promote another user first.',
    );
  }
}

export class CannotChangeOwnRoleError extends ApplicationError {
  readonly code = 'CANNOT_CHANGE_OWN_ROLE';
  constructor() {
    super('Administrators cannot change their own role.');
  }
}

export class CannotDeactivateSelfError extends ApplicationError {
  readonly code = 'CANNOT_DEACTIVATE_SELF';
  constructor() {
    super('You cannot deactivate your own account.');
  }
}
