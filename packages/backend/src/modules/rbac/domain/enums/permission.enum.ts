/**
 * Permission catalogue. Grows as feature modules land — anything a
 * feature guards on must appear here so RbacService can resolve it.
 */
export const Permission = {
  // Auth / self-service
  AuthManageOwnPassword: 'auth:manage-own-password',

  // User admin (SA)
  UserManage: 'user:manage',

  // Employee module
  EmployeeRead: 'employee:read',
  EmployeeManage: 'employee:manage',
  EmployeeManageStatus: 'employee:manage-status',

  // Asset module
  AssetRead: 'asset:read',
  AssetReadOwn: 'asset:read-own',
  AssetManage: 'asset:manage',
  AssetDirectStatus: 'asset:direct-status',

  // RBAC admin
  RbacRead: 'rbac:read',

  // Audit
  AuditRead: 'audit:read',

  // Assessment
  AssessmentRead: 'assessment:read',
  AssessmentManage: 'assessment:manage',

  // Workflow engine
  WorkflowRead: 'workflow:read',
  WorkflowConfigure: 'workflow:configure',
  WorkflowTransition: 'workflow:transition',
  WorkflowBypass: 'workflow:bypass',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] =
  Object.values(Permission);
