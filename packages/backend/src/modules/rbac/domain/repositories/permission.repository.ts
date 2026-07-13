export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

export interface PermissionRepository {
  listKeysForRole(roleId: string): Promise<string[]>;
  listAllKeys(): Promise<string[]>;
}
