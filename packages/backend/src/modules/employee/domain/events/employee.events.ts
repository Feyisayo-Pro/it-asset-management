import { DomainEvent } from '../../../../common/events/base-event';
import { EmploymentStatus } from '../value-objects/employment-status';

export class EmployeeCreatedEvent extends DomainEvent<{
  id: string;
  employeeCode: string;
  email: string;
  createdByUserId: string | null;
}> {
  readonly name = 'employee.created';
}

export class EmployeeUpdatedEvent extends DomainEvent<{
  id: string;
  updatedByUserId: string | null;
}> {
  readonly name = 'employee.updated';
}

export class EmployeeStatusChangedEvent extends DomainEvent<{
  id: string;
  employeeCode: string;
  from: EmploymentStatus;
  to: EmploymentStatus;
  changedByUserId: string | null;
}> {
  readonly name = 'employee.status-changed';
}
