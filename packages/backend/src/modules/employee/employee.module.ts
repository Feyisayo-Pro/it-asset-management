import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeOrmEntity } from './infrastructure/typeorm-entities/employee.orm-entity';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { EMPLOYEE_REPOSITORY } from './domain/repositories/employee.repository';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { ChangeEmploymentStatusUseCase } from './application/use-cases/change-employment-status.use-case';
import { GetEmployeeUseCase } from './application/use-cases/get-employee.use-case';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { EmployeeController } from './presentation/employee.controller';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeOrmEntity]),
    CommonModule,
    AuthModule,
  ],
  controllers: [EmployeeController],
  providers: [
    { provide: EMPLOYEE_REPOSITORY, useClass: TypeOrmEmployeeRepository },
    CreateEmployeeUseCase,
    UpdateEmployeeUseCase,
    ChangeEmploymentStatusUseCase,
    GetEmployeeUseCase,
    ListEmployeesUseCase,
  ],
  exports: [EMPLOYEE_REPOSITORY, GetEmployeeUseCase],
})
export class EmployeeModule {}
