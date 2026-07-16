import {
  AssessmentContextType,
  AssessmentOutcome,
  AssessmentStatus,
  ItemResult,
} from '../value-objects/assessment-enums';
import { AssessmentTemplate } from './assessment-template.entity';
import {
  AssessmentAlreadyCompletedError,
  AssessmentSignatureRequiredError,
  ChecklistIncompleteError,
  FailedItemNoteRequiredError,
  RecommendationsRequiredError,
  UnknownChecklistItemError,
} from '../../../../common/errors/assessment.errors';
import { AssessmentIncompleteError } from '../../../../common/errors/return.errors';

export interface ItemResultEntry {
  id: string;
  itemCode: string;
  result: ItemResult;
  note: string | null;
}

export interface AssessmentRecordProps {
  id: string;
  templateId: string;
  assetId: string;
  contextType: AssessmentContextType;
  contextId: string | null;
  status: AssessmentStatus;
  technicianUserId: string;
  outcome: AssessmentOutcome | null;
  findings: string | null;
  recommendations: string | null;
  photoUrls: string[] | null;
  signatureName: string | null;
  signatureIp: string | null;
  startedAt: Date;
  completedAt: Date | null;
  results: ItemResultEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AssessmentRecord aggregate root. Draft records accept incremental
 * item results; complete() validates the full checklist against the
 * template and freezes the record — completed assessments are
 * immutable evidence.
 */
export class AssessmentRecord {
  private constructor(private props: AssessmentRecordProps) {}

  static hydrate(props: AssessmentRecordProps): AssessmentRecord {
    return new AssessmentRecord(props);
  }

  static start(input: {
    id: string;
    templateId: string;
    assetId: string;
    contextType: AssessmentContextType;
    contextId?: string | null;
    technicianUserId: string;
    now?: Date;
  }): AssessmentRecord {
    const now = input.now ?? new Date();
    return new AssessmentRecord({
      id: input.id,
      templateId: input.templateId,
      assetId: input.assetId,
      contextType: input.contextType,
      contextId: input.contextId ?? null,
      status: 'Draft',
      technicianUserId: input.technicianUserId,
      outcome: null,
      findings: null,
      recommendations: null,
      photoUrls: null,
      signatureName: null,
      signatureIp: null,
      startedAt: now,
      completedAt: null,
      results: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get templateId(): string { return this.props.templateId; }
  get assetId(): string { return this.props.assetId; }
  get contextType(): AssessmentContextType { return this.props.contextType; }
  get contextId(): string | null { return this.props.contextId; }
  get status(): AssessmentStatus { return this.props.status; }
  get technicianUserId(): string { return this.props.technicianUserId; }
  get outcome(): AssessmentOutcome | null { return this.props.outcome; }
  get findings(): string | null { return this.props.findings; }
  get recommendations(): string | null { return this.props.recommendations; }
  get photoUrls(): string[] | null { return this.props.photoUrls; }
  get signatureName(): string | null { return this.props.signatureName; }
  get signatureIp(): string | null { return this.props.signatureIp; }
  get startedAt(): Date { return this.props.startedAt; }
  get completedAt(): Date | null { return this.props.completedAt; }
  get results(): ItemResultEntry[] { return [...this.props.results]; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  private assertDraft(): void {
    if (this.props.status !== 'Draft') {
      throw new AssessmentAlreadyCompletedError(this.props.id);
    }
  }

  /**
   * Upserts item results. Codes must exist on the template. Partial
   * saves are fine while drafting; full validation happens at
   * complete().
   */
  saveResults(
    template: AssessmentTemplate,
    entries: Array<{ itemCode: string; result: ItemResult; note?: string | null }>,
    idFor: () => string,
    now: Date,
  ): void {
    this.assertDraft();
    for (const entry of entries) {
      if (!template.findItem(entry.itemCode)) {
        throw new UnknownChecklistItemError(entry.itemCode);
      }
      const existing = this.props.results.find((r) => r.itemCode === entry.itemCode);
      if (existing) {
        existing.result = entry.result;
        existing.note = entry.note?.trim() || null;
      } else {
        this.props.results.push({
          id: idFor(),
          itemCode: entry.itemCode,
          result: entry.result,
          note: entry.note?.trim() || null,
        });
      }
    }
    this.props.updatedAt = now;
  }

  complete(
    template: AssessmentTemplate,
    input: {
      outcome: AssessmentOutcome;
      findings: string;
      recommendations?: string | null;
      photoUrls?: string[] | null;
      signatureName: string;
      signatureIp?: string | null;
    },
    now: Date,
  ): void {
    this.assertDraft();

    const answered = new Set(this.props.results.map((r) => r.itemCode));
    const missing = template.requiredCodes().filter((c) => !answered.has(c));
    if (missing.length > 0) throw new ChecklistIncompleteError(missing);

    for (const r of this.props.results) {
      if (r.result === 'Fail' && !r.note?.trim()) {
        throw new FailedItemNoteRequiredError(r.itemCode);
      }
    }

    if (!input.findings?.trim()) {
      throw new AssessmentIncompleteError('findings are required');
    }
    if (input.outcome !== 'Pass' && !input.recommendations?.trim()) {
      throw new RecommendationsRequiredError(input.outcome);
    }
    if (!input.signatureName?.trim()) {
      throw new AssessmentSignatureRequiredError();
    }

    this.props.outcome = input.outcome;
    this.props.findings = input.findings.trim();
    this.props.recommendations = input.recommendations?.trim() || null;
    this.props.photoUrls = input.photoUrls?.length ? input.photoUrls : null;
    this.props.signatureName = input.signatureName.trim();
    this.props.signatureIp = input.signatureIp ?? null;
    this.props.status = 'Completed';
    this.props.completedAt = now;
    this.props.updatedAt = now;
  }

  toPersistence(): AssessmentRecordProps {
    return { ...this.props, results: this.props.results.map((r) => ({ ...r })) };
  }
}
