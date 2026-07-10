/**
 * Fixed role catalogue (arch §10.3). Not user-editable at runtime.
 * The DB seed inserts one Role row per member of this enum with a
 * stable id (see migration).
 */
export enum RoleName {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORES_OFFICER = 'STORES_OFFICER',
  IT_REP = 'IT_REP',
  PEOPLE_CULTURE = 'PEOPLE_CULTURE',
  EMPLOYEE = 'EMPLOYEE',
}

export const ALL_ROLE_NAMES: RoleName[] = Object.values(RoleName);
