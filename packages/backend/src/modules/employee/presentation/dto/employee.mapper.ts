import { Employee } from '../../domain/entities/employee.entity';

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  managerId: string | null;
  officeLocation: string;
  hireDate: string;
  employmentStatus: string;
  terminationDate: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const toEmployeeDto = (e: Employee): EmployeeDto => ({
  id: e.id,
  employeeCode: e.employeeCode,
  firstName: e.firstName,
  lastName: e.lastName,
  fullName: e.fullName,
  email: e.email,
  department: e.department,
  designation: e.designation,
  managerId: e.managerId,
  officeLocation: e.officeLocation,
  hireDate: e.hireDate.toISOString().slice(0, 10),
  employmentStatus: e.employmentStatus,
  terminationDate: e.terminationDate
    ? e.terminationDate.toISOString().slice(0, 10)
    : null,
  userId: e.userId,
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString(),
});
