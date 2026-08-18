import {
  AssessmentOutcome,
  ReturnItemStatus,
  ReturnItemType,
  ReturnReason,
} from '../value-objects/return-enums';
import {
  AssessmentIncompleteError,
  ReturnItemNotesRequiredError,
  ReturnItemsRequiredError,
} from '../../../../common/errors/return.errors';

export interface ReturnItemProps {
  id: string;
  returnRecordId: string;
  itemType: ReturnItemType;
  description: string | null;
  status: ReturnItemStatus;
  notes: string | null;
}

export interface ReturnRecordProps {
  id: string;
  assetId: string;
  holderUserId: string | null;
  initiatedByUserId: string;
  reason: ReturnReason;
  reasonNotes: string | null;
  workflowInstanceId: string | null;
  currentState: string;
  findings: string | null;
  damageNotes: string | null;
  missingAccessories: string | null;
  outcome: AssessmentOutcome | null;
  photoUrls: string[] | null;
  items: ReturnItemProps[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ReturnRecord aggregate root. Owns the return's domain data (reason,
 * items, assessment). Process state lives in the workflow instance;
 * currentState here is a denormalized read-model snapshot kept in sync
 * by the use cases after each successful transition.
 */
export class ReturnRecord {
  private constructor(private props: ReturnRecordProps) {}

  static hydrate(props: ReturnRecordProps): ReturnRecord {
    return new ReturnRecord(props);
  }

  static initiate(input: {
    id: string;
    assetId: string;
    holderUserId: string | null;
    initiatedByUserId: string;
    reason: ReturnReason;
    reasonNotes?: string | null;
    now?: Date;
  }): ReturnRecord {
    const now = input.now ?? new Date();
    return new ReturnRecord({
      id: input.id,
      assetId: input.assetId,
      holderUserId: input.holderUserId,
      initiatedByUserId: input.initiatedByUserId,
      reason: input.reason,
      reasonNotes: input.reasonNotes ?? null,
      workflowInstanceId: null,
      currentState: 'Initiated',
      findings: null,
      damageNotes: null,
      missingAccessories: null,
      outcome: null,
      photoUrls: null,
      items: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get assetId(): string { return this.props.assetId; }
  get holderUserId(): string | null { return this.props.holderUserId; }
  get initiatedByUserId(): string { return this.props.initiatedByUserId; }
  get reason(): ReturnReason { return this.props.reason; }
  get reasonNotes(): string | null { return this.props.reasonNotes; }
  get workflowInstanceId(): string | null { return this.props.workflowInstanceId; }
  get currentState(): string { return this.props.currentState; }
  get findings(): string | null { return this.props.findings; }
  get damageNotes(): string | null { return this.props.damageNotes; }
  get missingAccessories(): string | null { return this.props.missingAccessories; }
  get outcome(): AssessmentOutcome | null { return this.props.outcome; }
  get photoUrls(): string[] | null { return this.props.photoUrls; }
  get items(): ReturnItemProps[] { return [...this.props.items]; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isTerminal(): boolean {
    return (
      this.props.currentState === 'Completed' ||
      this.props.currentState === 'Cancelled'
    );
  }

  attachWorkflowInstance(instanceId: string, now: Date): void {
    this.props.workflowInstanceId = instanceId;
    this.props.updatedAt = now;
  }

  syncState(state: string, now: Date): void {
    this.props.currentState = state;
    this.props.updatedAt = now;
  }

  /**
   * Replaces the item list. Enforces: non-empty, Missing/Damaged items
   * must carry notes.
   */
  recordItems(
    items: Array<Omit<ReturnItemProps, 'id' | 'returnRecordId'>>,
    idFor: () => string,
    now: Date,
  ): void {
    if (items.length === 0) throw new ReturnItemsRequiredError();
    for (const item of items) {
      if (
        (item.status === 'Missing' || item.status === 'Damaged') &&
        !item.notes?.trim()
      ) {
        throw new ReturnItemNotesRequiredError(item.itemType);
      }
    }
    this.props.items = items.map((item) => ({
      ...item,
      id: idFor(),
      returnRecordId: this.props.id,
      description: item.description ?? null,
      notes: item.notes ?? null,
    }));
    this.props.updatedAt = now;
  }

  /**
   * Records the IT post-return assessment. Findings + outcome required;
   * damage notes required when any item is Damaged; missing accessories
   * required when any item is Missing.
   */
  recordAssessment(
    input: {
      findings: string;
      outcome: AssessmentOutcome;
      damageNotes?: string | null;
      missingAccessories?: string | null;
      photoUrls?: string[] | null;
    },
    now: Date,
  ): void {
    if (!input.findings?.trim()) {
      throw new AssessmentIncompleteError('findings are required');
    }
    const hasDamaged = this.props.items.some((i) => i.status === 'Damaged');
    const hasMissing = this.props.items.some((i) => i.status === 'Missing');
    if (hasDamaged && !input.damageNotes?.trim()) {
      throw new AssessmentIncompleteError(
        'damage notes are required when items are damaged',
      );
    }
    if (hasMissing && !input.missingAccessories?.trim()) {
      throw new AssessmentIncompleteError(
        'missing accessories must be listed when items are missing',
      );
    }
    this.props.findings = input.findings.trim();
    this.props.outcome = input.outcome;
    this.props.damageNotes = input.damageNotes?.trim() || null;
    this.props.missingAccessories = input.missingAccessories?.trim() || null;
    this.props.photoUrls = input.photoUrls?.length ? input.photoUrls : null;
    this.props.updatedAt = now;
  }

  toPersistence(): ReturnRecordProps {
    return { ...this.props, items: [...this.props.items] };
  }
}
