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
  returns: {
    all: ['returns'] as const,
    list: (params: Record<string, unknown>) => ['returns', 'list', params] as const,
    byId: (id: string) => ['returns', 'detail', id] as const,
  },
  assessments: {
    all: ['assessments'] as const,
    templates: ['assessments', 'templates'] as const,
    list: (params: Record<string, unknown>) => ['assessments', 'list', params] as const,
    byId: (id: string) => ['assessments', 'detail', id] as const,
  },
  repairs: {
    all: ['repairs'] as const,
    list: (params: Record<string, unknown>) => ['repairs', 'list', params] as const,
    byId: (id: string) => ['repairs', 'detail', id] as const,
    byAsset: (assetId: string) => ['repairs', 'by-asset', assetId] as const,
  },
  disposals: {
    all: ['disposals'] as const,
    list: (params: Record<string, unknown>) => ['disposals', 'list', params] as const,
    byId: (id: string) => ['disposals', 'detail', id] as const,
    byAsset: (assetId: string) => ['disposals', 'by-asset', assetId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params: Record<string, unknown>) => ['notifications', 'list', params] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  reports: {
    all: ['reports'] as const,
    byType: (type: string, params?: Record<string, unknown>) =>
      ['reports', type, params] as const,
    dashboard: ['reports', 'dashboard'] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params: Record<string, unknown>) => ['audit-logs', 'list', params] as const,
    byId: (id: string) => ['audit-logs', 'detail', id] as const,
  },
  enterpriseDashboard: {
    all: ['enterprise-dashboard'] as const,
    data: (params?: Record<string, unknown>) =>
      ['enterprise-dashboard', 'data', params] as const,
    filterOptions: ['enterprise-dashboard', 'filter-options'] as const,
  },
};
