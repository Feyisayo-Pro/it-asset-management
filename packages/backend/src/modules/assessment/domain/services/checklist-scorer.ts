import { AssessmentTemplate } from '../entities/assessment-template.entity';
import {
  AssessmentOutcome,
  ItemResult,
} from '../value-objects/assessment-enums';

/**
 * ChecklistScorer — computes a SUGGESTED outcome from item results.
 * Advisory only: the technician always confirms or overrides. This is
 * the "improve it" step over the paper form, which had no guidance.
 *
 * Heuristic:
 * - Condition failures are severe: boots_successfully Fail → Reject;
 *   any other Condition Fail → ReplacementRecommended.
 * - ≥ 3 Hardware failures → ReplacementRecommended.
 * - Any Hardware or Software failure → RepairRecommended.
 * - Otherwise → Pass.
 */
export class ChecklistScorer {
  static suggest(
    template: AssessmentTemplate,
    results: Array<{ itemCode: string; result: ItemResult }>,
  ): AssessmentOutcome {
    const failedCodes = results
      .filter((r) => r.result === 'Fail')
      .map((r) => r.itemCode);
    if (failedCodes.length === 0) return 'Pass';

    const categoryOf = (code: string) => template.findItem(code)?.category;

    if (failedCodes.includes('boots_successfully')) return 'Reject';
    if (failedCodes.some((c) => categoryOf(c) === 'Condition')) {
      return 'ReplacementRecommended';
    }
    const hardwareFails = failedCodes.filter(
      (c) => categoryOf(c) === 'Hardware',
    ).length;
    if (hardwareFails >= 3) return 'ReplacementRecommended';
    return 'RepairRecommended';
  }
}
