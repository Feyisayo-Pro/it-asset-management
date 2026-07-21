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

  // Repair
  RepairRead: 'repair:read',
  RepairManage: 'repair:manage',

  // Disposal
  DisposalRead: 'disposal:read',
  DisposalRequest: 'disposal:request',
  DisposalApprove: 'disposal:approve',

  // Workflow engine
  WorkflowRead: 'workflow:read',
  WorkflowConfigure: 'workflow:configure',
  WorkflowTransition: 'workflow:transition',
  WorkflowBypass: 'workflow:bypass',

  // Notification
  NotificationRead: 'notification:read',
  NotificationManage: 'notification:manage',

  // Reporting
  ReportRead: 'report:read',
  ReportExport: 'report:export',

  // Dashboard
  DashboardRead: 'dashboard:read',

  // Master Data
  MasterDataManage: 'master-data:manage',

  // Vendor
  VendorRead: 'vendor:read',
  VendorManage: 'vendor:manage',

  // Acquisition
  AcquisitionRead: 'acquisition:read',
  AcquisitionManage: 'acquisition:manage',

  // Allocation
  AllocationRead: 'allocation:read',
  AllocationManage: 'allocation:manage',

  // Compliance
  ComplianceRead: 'compliance:read',
  ComplianceManage: 'compliance:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] =
  Object.values(Permission);
