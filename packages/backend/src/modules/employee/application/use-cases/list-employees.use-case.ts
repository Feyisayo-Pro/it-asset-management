import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
  ListEmployeesParams,
  ListEmployeesResult,
} from '../../domain/repositories/employee.repository';

@Injectable()
export class ListEmployeesUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
  ) {}

  async execute(params: ListEmployeesParams): Promise<ListEmployeesResult> {
    return this.employees.list(params);
  }
}
