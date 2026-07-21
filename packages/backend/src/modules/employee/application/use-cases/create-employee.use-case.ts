import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { EmployeeCreatedEvent } from '../../domain/events/employee.events';
import {
  DuplicateEmployeeCodeError,
  DuplicateEmployeeEmailError,
} from '../../../../common/errors/employee.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export interface CreateEmployeeCommand {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  managerId?: string | null;
  officeLocation: string;
  hireDate: string;
  userId?: string | null;
}

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    if (await this.employees.findByCode(command.employeeCode)) {
      throw new DuplicateEmployeeCodeError(command.employeeCode);
    }
    if (await this.employees.findByEmail(command.email)) {
      throw new DuplicateEmployeeEmailError(command.email);
    }

    const now = this.clock.now();
    const employee = Employee.create({
      id: this.ids.next(),
      employeeCode: command.employeeCode,
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      department: command.department,
      designation: command.designation,
      managerId: command.managerId ?? null,
      officeLocation: command.officeLocation,
      hireDate: new Date(command.hireDate),
      userId: command.userId ?? null,
      now,
    });

    await this.employees.save(employee);

    const ctx = asyncContext.get();
    this.events.publish(
      new EmployeeCreatedEvent({
        id: employee.id,
        employeeCode: employee.employeeCode,
        email: employee.email,
        createdByUserId: ctx?.userId ?? null,
      }),
    );

    return employee;
  }
}
