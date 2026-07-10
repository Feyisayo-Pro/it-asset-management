export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    myPermissions: ['auth', 'permissions'] as const,
  },
  rbac: {
    roles: ['rbac', 'roles'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    byId: (id: string) => ['users', 'detail', id] as const,
  },
};
