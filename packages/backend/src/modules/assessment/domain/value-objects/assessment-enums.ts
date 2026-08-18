export const ItemResult = {
  Pass: 'Pass',
  Fail: 'Fail',
  NA: 'NA',
} as const;
export type ItemResult = (typeof ItemResult)[keyof typeof ItemResult];
export const ALL_ITEM_RESULTS: readonly ItemResult[] = Object.values(ItemResult);

/**
 * Matches DEVICE ASSESSMENT FORM.docx exactly (3 outcomes) — see
 * docs/22-sapphire-virtual-source-data.md §3. No "Reject" outcome
 * exists on the real form; ChecklistScorer maps what used to suggest
 * Reject (device won't power on) onto ReplacementRecommended instead.
 */
export const AssessmentOutcome = {
  NoFaultFound: 'NoFaultFound',
  RepairRecommended: 'RepairRecommended',
  ReplacementRecommended: 'ReplacementRecommended',
} as const;
export type AssessmentOutcome =
  (typeof AssessmentOutcome)[keyof typeof AssessmentOutcome];
export const ALL_ASSESSMENT_OUTCOMES: readonly AssessmentOutcome[] =
  Object.values(AssessmentOutcome);

export const AssessmentStatus = {
  Draft: 'Draft',
  Completed: 'Completed',
} as const;
export type AssessmentStatus =
  (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

export const AssessmentContextType = {
  Standalone: 'Standalone',
  Allocation: 'Allocation',
  Return: 'Return',
  Repair: 'Repair',
} as const;
export type AssessmentContextType =
  (typeof AssessmentContextType)[keyof typeof AssessmentContextType];
export const ALL_CONTEXT_TYPES: readonly AssessmentContextType[] =
  Object.values(AssessmentContextType);

export const ItemCategory = {
  Hardware: 'Hardware',
  Software: 'Software',
  Condition: 'Condition',
} as const;
export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory];

/** Template key seeded in migration 1720600000000. */
export const STANDARD_TEMPLATE_KEY = 'standard-device-assessment';
