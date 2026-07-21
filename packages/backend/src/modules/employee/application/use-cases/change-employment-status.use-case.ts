import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EmploymentStatus } from '../../domain/value-objects/employment-status';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { EmployeeStatusChangedEvent } from '../../domain/events/employee.events';
import { EmployeeNotFoundError } from '../../../../common/errors/employee.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface ChangeEmploymentStatusCommand {
  employeeId: string;
  status: EmploymentStatus;
  terminationDate?: string | null;
}

@Injectable()
export class ChangeEmploymentStatusUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ChangeEmploymentStatusCommand): Promise<Employee> {
    const employee = await this.employees.findById(command.employeeId);
    if (!employee) throw new EmployeeNotFoundError(command.employeeId);

    const from = employee.employmentStatus;
    const now = this.clock.now();

    employee.changeStatus(
      command.status,
      now,
      command.terminationDate ? new Date(command.terminationDate) : null,
    );

    await this.employees.save(employee);

    const ctx = asyncContext.get();
    this.events.publish(
      new EmployeeStatusChangedEvent({
        id: employee.id,
        employeeCode: employee.employeeCode,
        from,
        to: command.status,
        changedByUserId: ctx?.userId ?? null,
      }),
    );

    return employee;
  }
}
