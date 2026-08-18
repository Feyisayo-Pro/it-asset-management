export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORES_OFFICER: 'STORES_OFFICER',
  IT_REP: 'IT_REP',
  PEOPLE_CULTURE: 'PEOPLE_CULTURE',
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ROLE_LABEL: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  STORES_OFFICER: 'Stores Officer',
  IT_REP: 'IT Representative',
  PEOPLE_CULTURE: 'People & Culture',
  EMPLOYEE: 'Employee',
};

export const ROLE_COLOR: Record<RoleName, string> = {
  SUPER_ADMIN: 'purple',
  STORES_OFFICER: 'blue',
  IT_REP: 'cyan',
  PEOPLE_CULTURE: 'green',
  EMPLOYEE: 'default',
};
