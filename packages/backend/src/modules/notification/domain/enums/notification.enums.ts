export const NotificationEventType = {
  AllocationRequested: 'ALLOCATION_REQUESTED',
  AllocationApproved: 'ALLOCATION_APPROVED',
  AllocationRejected: 'ALLOCATION_REJECTED',
  AssessmentCompleted: 'ASSESSMENT_COMPLETED',
  AssetReturned: 'ASSET_RETURNED',
  RepairRequested: 'REPAIR_REQUESTED',
  RepairCompleted: 'REPAIR_COMPLETED',
  DisposalApproved: 'DISPOSAL_APPROVED',
  Escalation: 'ESCALATION',
  SlaBreach: 'SLA_BREACH',
} as const;
export type NotificationEventType =
  (typeof NotificationEventType)[keyof typeof NotificationEventType];

export const ALL_NOTIFICATION_EVENT_TYPES = Object.values(NotificationEventType);

export const NotificationChannel = {
  InApp: 'IN_APP',
  Email: 'EMAIL',
  Sms: 'SMS',
  Teams: 'TEAMS',
  Slack: 'SLACK',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];
