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
  assets: {
    all: ['assets'] as const,
    list: (params: Record<string, unknown>) => ['assets', 'list', params] as const,
    byId: (id: string) => ['assets', 'detail', id] as const,
    history: (id: string) => ['assets', 'history', id] as const,
  },
  workflows: {
    definitions: ['workflows', 'definitions'] as const,
    instance: (id: string) => ['workflows', 'instance', id] as const,
  },
};
