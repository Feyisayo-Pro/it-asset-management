import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
} from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeNotFoundError } from '../../../../common/errors/employee.errors';

@Injectable()
export class GetEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
  ) {}

  async byId(id: string): Promise<Employee> {
    const employee = await this.employees.findById(id);
    if (!employee) throw new EmployeeNotFoundError(id);
    return employee;
  }

  async byUserId(userId: string): Promise<Employee | null> {
    return this.employees.findByUserId(userId);
  }
}
