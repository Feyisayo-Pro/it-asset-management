import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Employee, EmployeeProps } from '../../domain/entities/employee.entity';
import {
  EmployeeRepository,
  ListEmployeesParams,
  ListEmployeesResult,
} from '../../domain/repositories/employee.repository';
import { EmployeeOrmEntity } from '../typeorm-entities/employee.orm-entity';
import { EmploymentStatus } from '../../domain/value-objects/employment-status';

@Injectable()
export class TypeOrmEmployeeRepository implements EmployeeRepository {
  constructor(
    @InjectRepository(EmployeeOrmEntity)
    private readonly repo: Repository<EmployeeOrmEntity>,
  ) {}

  async findById(id: string): Promise<Employee | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByCode(code: string): Promise<Employee | null> {
    const row = await this.repo.findOne({
      where: { employeeCode: code.trim().toUpperCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const row = await this.repo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    const row = await this.repo.findOne({ where: { userId } });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListEmployeesParams): Promise<ListEmployeesResult> {
    const qb = this.repo.createQueryBuilder('e');

    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(e.first_name) LIKE :like', { like })
            .orWhere('LOWER(e.last_name) LIKE :like', { like })
            .orWhere('LOWER(e.email) LIKE :like', { like })
            .orWhere('LOWER(e.employee_code) LIKE :like', { like });
        }),
      );
    }
    if (params.department) qb.andWhere('e.department = :dep', { dep: params.department });
    if (params.officeLocation) qb.andWhere('e.office_location = :loc', { loc: params.officeLocation });
    if (params.employmentStatus) qb.andWhere('e.employment_status = :st', { st: params.employmentStatus });

    const sortMap: Record<string, string> = {
      lastName: 'e.last_name',
      employeeCode: 'e.employee_code',
      department: 'e.department',
      createdAt: 'e.created_at',
    };
    const sortField = params.sort ? (sortMap[params.sort.field] ?? 'e.last_name') : 'e.last_name';
    const sortDir: 'ASC' | 'DESC' = params.sort?.direction === 'desc' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortDir);

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) => this.toDomain(r)),
      page,
      pageSize,
      total,
    };
  }

  async save(employee: Employee): Promise<Employee> {
    await this.repo.upsert(this.toRow(employee.toPersistence()), ['id']);
    return employee;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(row: EmployeeOrmEntity): Employee {
    return Employee.hydrate({
      id: row.id,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      department: row.department,
      designation: row.designation,
      managerId: row.managerId,
      officeLocation: row.officeLocation,
      hireDate: row.hireDate,
      employmentStatus: row.employmentStatus as EmploymentStatus,
      terminationDate: row.terminationDate,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(props: EmployeeProps): EmployeeOrmEntity {
    const row = new EmployeeOrmEntity();
    row.id = props.id;
    row.employeeCode = props.employeeCode;
    row.firstName = props.firstName;
    row.lastName = props.lastName;
    row.email = props.email;
    row.department = props.department;
    row.designation = props.designation;
    row.managerId = props.managerId;
    row.officeLocation = props.officeLocation;
    row.hireDate = props.hireDate;
    row.employmentStatus = props.employmentStatus;
    row.terminationDate = props.terminationDate;
    row.userId = props.userId;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    return row;
  }
}
