import { IsUUID } from 'class-validator';

export class AdminChangeRoleDto {
  @IsUUID()
  roleId!: string;
}
