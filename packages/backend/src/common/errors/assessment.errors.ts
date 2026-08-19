import { ApplicationError } from './domain.error';

export class AssessmentNotFoundError extends ApplicationError {
  readonly code = 'ASSESSMENT_NOT_FOUND';
  constructor(id: string) {
    super('Assessment not found', { id });
  }
}

export class AssessmentTemplateNotFoundError extends ApplicationError {
  readonly code = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  constructor(key: string) {
    super('Assessment template not found', { key });
  }
}

export class AssessmentAlreadyCompletedError extends ApplicationError {
  readonly code = 'ASSESSMENT_ALREADY_COMPLETED';
  constructor(id: string) {
    super('Completed assessments are immutable', { id });
  }
}

export class UnknownChecklistItemError extends ApplicationError {
  readonly code = 'UNKNOWN_CHECKLIST_ITEM';
  constructor(code: string) {
    super('Result supplied for an item not on the template', { itemCode: code });
  }
}

export class ChecklistIncompleteError extends ApplicationError {
  readonly code = 'CHECKLIST_INCOMPLETE';
  constructor(missing: string[]) {
    super('Every required checklist item must be answered', { missing });
  }
}

export class FailedItemNoteRequiredError extends ApplicationError {
  readonly code = 'FAILED_ITEM_NOTE_REQUIRED';
  constructor(code: string) {
    super('Failed checklist items require a note', { itemCode: code });
  }
}

export class AssessmentSignatureRequiredError extends ApplicationError {
  readonly code = 'ASSESSMENT_SIGNATURE_REQUIRED';
  constructor() {
    super('Completing an assessment requires the technician signature');
  }
}

export class RecommendationsRequiredError extends ApplicationError {
  readonly code = 'RECOMMENDATIONS_REQUIRED';
  constructor(outcome: string) {
    super('Non-pass outcomes require recommendations', { outcome });
  }
}

export class HardwareSpecNonComplianceError extends ApplicationError {
  readonly code = 'HARDWARE_SPEC_NON_COMPLIANCE';
  constructor(roleLevel: string, warnings: string[]) {
    super(
      `Hardware Spec Non-Compliant for ${roleLevel} — completion requires an Executive Override with justification`,
      { roleLevel, warnings },
    );
  }
}

export class SpecOverrideJustificationRequiredError extends ApplicationError {
  readonly code = 'SPEC_OVERRIDE_JUSTIFICATION_REQUIRED';
  constructor() {
    super('An Executive Override requires a justification');
  }
}
