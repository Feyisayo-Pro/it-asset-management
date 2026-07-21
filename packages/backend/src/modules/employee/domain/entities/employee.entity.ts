import { EmploymentStatus, TERMINAL_STATUSES } from '../value-objects/employment-status';

export interface EmployeeProps {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  managerId: string | null;
  officeLocation: string;
  hireDate: Date;
  employmentStatus: EmploymentStatus;
  terminationDate: Date | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Employee {
  private constructor(private props: EmployeeProps) {}

  static hydrate(props: EmployeeProps): Employee {
    return new Employee(props);
  }

  static create(input: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
    managerId?: string | null;
    officeLocation: string;
    hireDate: Date;
    userId?: string | null;
    now?: Date;
  }): Employee {
    const now = input.now ?? new Date();
    return new Employee({
      id: input.id,
      employeeCode: input.employeeCode.trim().toUpperCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      department: input.department.trim(),
      designation: input.designation.trim(),
      managerId: input.managerId ?? null,
      officeLocation: input.officeLocation.trim(),
      hireDate: input.hireDate,
      employmentStatus: EmploymentStatus.Active,
      terminationDate: null,
      userId: input.userId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get employeeCode(): string { return this.props.employeeCode; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get email(): string { return this.props.email; }
  get department(): string { return this.props.department; }
  get designation(): string { return this.props.designation; }
  get managerId(): string | null { return this.props.managerId; }
  get officeLocation(): string { return this.props.officeLocation; }
  get hireDate(): Date { return this.props.hireDate; }
  get employmentStatus(): EmploymentStatus { return this.props.employmentStatus; }
  get terminationDate(): Date | null { return this.props.terminationDate; }
  get userId(): string | null { return this.props.userId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(
    patch: Partial<
      Pick<
        EmployeeProps,
        | 'firstName'
        | 'lastName'
        | 'email'
        | 'department'
        | 'designation'
        | 'managerId'
        | 'officeLocation'
        | 'userId'
      >
    >,
    now: Date,
  ): void {
    Object.assign(this.props, patch);
    this.props.updatedAt = now;
  }

  changeStatus(status: EmploymentStatus, now: Date, terminationDate?: Date | null): void {
    if (TERMINAL_STATUSES.includes(status) && !terminationDate) {
      throw new Error('Termination date is required for terminal statuses');
    }
    this.props.employmentStatus = status;
    this.props.terminationDate = terminationDate ?? null;
    this.props.updatedAt = now;
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.includes(this.props.employmentStatus);
  }

  toPersistence(): EmployeeProps {
    return { ...this.props };
  }
}
