import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleOrmEntity } from './infrastructure/typeorm-entities/role.orm-entity';
import { PermissionOrmEntity } from './infrastructure/typeorm-entities/permission.orm-entity';
import { TypeOrmRoleRepository } from './infrastructure/repositories/typeorm-role.repository';
import { TypeOrmPermissionRepository } from './infrastructure/repositories/typeorm-permission.repository';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission.repository';
import { RbacService } from './application/rbac.service';
import { RbacController } from './presentation/rbac.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoleOrmEntity, PermissionOrmEntity])],
  providers: [
    RbacService,
    { provide: ROLE_REPOSITORY, useClass: TypeOrmRoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: TypeOrmPermissionRepository },
  ],
  controllers: [RbacController],
  exports: [RbacService],
})
export class RbacModule {}
