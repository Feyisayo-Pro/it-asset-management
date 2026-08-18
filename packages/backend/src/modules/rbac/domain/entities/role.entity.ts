import { RoleName } from '../enums/role-name.enum';

export class Role {
  constructor(
    readonly id: string,
    readonly name: RoleName,
    readonly description: string,
  ) {}
}
