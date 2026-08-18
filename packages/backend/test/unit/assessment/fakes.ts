import { AssessmentRecord } from '../../../src/modules/assessment/domain/entities/assessment-record.entity';
import { AssessmentTemplate } from '../../../src/modules/assessment/domain/entities/assessment-template.entity';
import {
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
  ListAssessmentsParams,
  ListAssessmentsResult,
} from '../../../src/modules/assessment/domain/repositories/assessment.repositories';
import { ItemCategory } from '../../../src/modules/assessment/domain/value-objects/assessment-enums';

/**
 * In-memory copy of the standard 8-item template seeded by migration
 * (AddDeviceAssessment1720600000000 + reconciled by
 * ReconcileDeviceAssessmentChecklist1721200000000 to match DEVICE
 * ASSESSMENT FORM.docx exactly).
 */
export const buildStandardTemplate = (): AssessmentTemplate => {
  const mk = (
    code: string,
    label: string,
    category: ItemCategory,
    sortOrder: number,
  ) => ({ id: `tpl-item-${code}`, code, label, category, required: true, sortOrder });
  // [code, label, category], in DEVICE ASSESSMENT FORM.docx order.
  const items: Array<[string, string, ItemCategory]> = [
    ['screen_intact', 'Screen Intact', 'Hardware'],
    ['keyboard_functional', 'Keyboard Functional', 'Hardware'],
    ['charger_available', 'Charger Available', 'Hardware'],
    ['no_water_damage', 'No Water Damage', 'Condition'],
    ['no_missing_components', 'No Missing Components', 'Condition'],
    ['hard_drive_functional', 'Hard Drive Functional', 'Hardware'],
    ['os_functional', 'Operating System Functional', 'Software'],
    ['device_powers_on', 'Device Powers On', 'Hardware'],
  ];
  return AssessmentTemplate.hydrate({
    id: 'tpl-1',
    key: 'standard-device-assessment',
    version: 1,
    name: 'Standard Device Assessment',
    description: null,
    isActive: true,
    createdAt: new Date(),
    items: items.map(([code, label, category], i) => mk(code, label, category, i + 1)),
  });
};

export class FakeAssessmentTemplateRepository implements AssessmentTemplateRepository {
  private byId = new Map<string, AssessmentTemplate>();
  add(t: AssessmentTemplate): void {
    this.byId.set(t.id, t);
  }
  async findById(id: string): Promise<AssessmentTemplate | null> {
    return this.byId.get(id) ?? null;
  }
  async findLatestByKey(key: string): Promise<AssessmentTemplate | null> {
    let best: AssessmentTemplate | null = null;
    for (const t of this.byId.values()) {
      if (t.key === key && t.isActive && (!best || t.version > best.version)) best = t;
    }
    return best;
  }
  async listActive(): Promise<AssessmentTemplate[]> {
    return Array.from(this.byId.values()).filter((t) => t.isActive);
  }
}

export class FakeAssessmentRecordRepository implements AssessmentRecordRepository {
  public records = new Map<string, AssessmentRecord>();
  async findById(id: string): Promise<AssessmentRecord | null> {
    return this.records.get(id) ?? null;
  }
  async list(params: ListAssessmentsParams): Promise<ListAssessmentsResult> {
    let items = Array.from(this.records.values());
    if (params.assetId) items = items.filter((r) => r.assetId === params.assetId);
    if (params.status) items = items.filter((r) => r.status === params.status);
    if (params.contextType) items = items.filter((r) => r.contextType === params.contextType);
    if (params.contextId) items = items.filter((r) => r.contextId === params.contextId);
    const total = items.length;
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    return {
      data: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
    };
  }
  async save(record: AssessmentRecord): Promise<AssessmentRecord> {
    this.records.set(record.id, record);
    return record;
  }
}
