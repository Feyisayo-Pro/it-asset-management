import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { EmployeeUpdatedEvent } from '../../domain/events/employee.events';
import {
  DuplicateEmployeeEmailError,
  EmployeeNotFoundError,
} from '../../../../common/errors/employee.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface UpdateEmployeeCommand {
  employeeId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  designation?: string;
  managerId?: string | null;
  officeLocation?: string;
  userId?: string | null;
}

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: UpdateEmployeeCommand): Promise<Employee> {
    const employee = await this.employees.findById(command.employeeId);
    if (!employee) throw new EmployeeNotFoundError(command.employeeId);

    if (command.email && command.email.toLowerCase() !== employee.email) {
      const existing = await this.employees.findByEmail(command.email);
      if (existing && existing.id !== employee.id) {
        throw new DuplicateEmployeeEmailError(command.email);
      }
    }

    const now = this.clock.now();
    const patch: Record<string, unknown> = {};
    if (command.firstName !== undefined) patch.firstName = command.firstName.trim();
    if (command.lastName !== undefined) patch.lastName = command.lastName.trim();
    if (command.email !== undefined) patch.email = command.email.trim().toLowerCase();
    if (command.department !== undefined) patch.department = command.department.trim();
    if (command.designation !== undefined) patch.designation = command.designation.trim();
    if (command.managerId !== undefined) patch.managerId = command.managerId;
    if (command.officeLocation !== undefined) patch.officeLocation = command.officeLocation.trim();
    if (command.userId !== undefined) patch.userId = command.userId;

    employee.updateDetails(patch, now);
    await this.employees.save(employee);

    const ctx = asyncContext.get();
    this.events.publish(
      new EmployeeUpdatedEvent({
        id: employee.id,
        updatedByUserId: ctx?.userId ?? null,
      }),
    );

    return employee;
  }
}
