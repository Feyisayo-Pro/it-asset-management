import { ApplicationError } from './domain.error';

export class EmployeeNotFoundError extends ApplicationError {
  readonly code = 'EMPLOYEE_NOT_FOUND';
  constructor(id: string) {
    super('Employee not found', { id });
  }
}

export class DuplicateEmployeeCodeError extends ApplicationError {
  readonly code = 'DUPLICATE_EMPLOYEE_CODE';
  constructor(code: string) {
    super('Employee code already in use', { employeeCode: code });
  }
}

export class DuplicateEmployeeEmailError extends ApplicationError {
  readonly code = 'DUPLICATE_EMPLOYEE_EMAIL';
  constructor(email: string) {
    super('Employee email already in use', { email });
  }
}
