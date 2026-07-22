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

const toDateStr = (v: Date | string): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

const toIso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

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
  hireDate: toDateStr(e.hireDate),
  employmentStatus: e.employmentStatus,
  terminationDate: e.terminationDate ? toDateStr(e.terminationDate) : null,
  userId: e.userId,
  createdAt: toIso(e.createdAt),
  updatedAt: toIso(e.updatedAt),
});
