export const ReturnReason = {
  Resignation: 'Resignation',
  Termination: 'Termination',
  Transfer: 'Transfer',
  Replacement: 'Replacement',
  Repair: 'Repair',
  Lost: 'Lost',
  Other: 'Other',
} as const;
export type ReturnReason = (typeof ReturnReason)[keyof typeof ReturnReason];
export const ALL_RETURN_REASONS: readonly ReturnReason[] =
  Object.values(ReturnReason);

export const ReturnItemType = {
  Laptop: 'Laptop',
  Phone: 'Phone',
  Charger: 'Charger',
  Mouse: 'Mouse',
  Dock: 'Dock',
  Keyboard: 'Keyboard',
  Monitor: 'Monitor',
  Other: 'Other',
} as const;
export type ReturnItemType = (typeof ReturnItemType)[keyof typeof ReturnItemType];
export const ALL_RETURN_ITEM_TYPES: readonly ReturnItemType[] =
  Object.values(ReturnItemType);

export const ReturnItemStatus = {
  Returned: 'Returned',
  Missing: 'Missing',
  Damaged: 'Damaged',
} as const;
export type ReturnItemStatus =
  (typeof ReturnItemStatus)[keyof typeof ReturnItemStatus];
export const ALL_RETURN_ITEM_STATUSES: readonly ReturnItemStatus[] =
  Object.values(ReturnItemStatus);

export const AssessmentOutcome = {
  Pass: 'Pass',
  RepairRecommended: 'RepairRecommended',
  ReplacementRecommended: 'ReplacementRecommended',
  Reject: 'Reject',
} as const;
export type AssessmentOutcome =
  (typeof AssessmentOutcome)[keyof typeof AssessmentOutcome];
export const ALL_ASSESSMENT_OUTCOMES: readonly AssessmentOutcome[] =
  Object.values(AssessmentOutcome);

/** Workflow definition key seeded in migration 1720500000000. */
export const RETURN_WORKFLOW_KEY = 'asset-return';
/** subjectType used on workflow instances owned by this module. */
export const RETURN_SUBJECT_TYPE = 'ReturnRecord';
