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
 * Heuristic, against the 8-item standard checklist (DEVICE ASSESSMENT
 * FORM.docx / docs/22-sapphire-virtual-source-data.md §3):
 * - device_powers_on Fail → ReplacementRecommended. The form has no
 *   "Reject" outcome (unlike the previous 22-item scheme this
 *   replaces), so a device that won't power on maps to the closest
 *   real outcome rather than a state the form doesn't support.
 * - Any Condition-category Fail (no_water_damage,
 *   no_missing_components) → ReplacementRecommended.
 * - 2+ Hardware-category failures → ReplacementRecommended. (Lower
 *   than the old 3-of-12 threshold since there are only 5 hardware
 *   items now — proportionally similar severity.)
 * - Any other single Hardware/Software failure → RepairRecommended.
 * - Otherwise → NoFaultFound.
 */
export class ChecklistScorer {
  static suggest(
    template: AssessmentTemplate,
    results: Array<{ itemCode: string; result: ItemResult }>,
  ): AssessmentOutcome {
    const failedCodes = results
      .filter((r) => r.result === 'Fail')
      .map((r) => r.itemCode);
    if (failedCodes.length === 0) return 'NoFaultFound';

    const categoryOf = (code: string) => template.findItem(code)?.category;

    if (failedCodes.includes('device_powers_on')) return 'ReplacementRecommended';
    if (failedCodes.some((c) => categoryOf(c) === 'Condition')) {
      return 'ReplacementRecommended';
    }
    const hardwareFails = failedCodes.filter(
      (c) => categoryOf(c) === 'Hardware',
    ).length;
    if (hardwareFails >= 2) return 'ReplacementRecommended';
    return 'RepairRecommended';
  }
}
