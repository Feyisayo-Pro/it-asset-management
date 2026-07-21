import { Employee } from '../entities/employee.entity';
import { EmploymentStatus } from '../value-objects/employment-status';

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

export type EmployeeSortField = 'lastName' | 'employeeCode' | 'department' | 'createdAt';

export interface ListEmployeesParams {
  page: number;
  pageSize: number;
  search?: string;
  department?: string;
  officeLocation?: string;
  employmentStatus?: EmploymentStatus;
  sort?: { field: EmployeeSortField; direction: 'asc' | 'desc' };
}

export interface ListEmployeesResult {
  data: Employee[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByCode(code: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByUserId(userId: string): Promise<Employee | null>;
  list(params: ListEmployeesParams): Promise<ListEmployeesResult>;
  save(employee: Employee): Promise<Employee>;
  delete(id: string): Promise<void>;
}
