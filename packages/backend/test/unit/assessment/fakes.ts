import { AssessmentRecord } from '../../../src/modules/assessment/domain/entities/assessment-record.entity';
import { AssessmentTemplate } from '../../../src/modules/assessment/domain/entities/assessment-template.entity';
import {
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
  ListAssessmentsParams,
  ListAssessmentsResult,
} from '../../../src/modules/assessment/domain/repositories/assessment.repositories';
import { ItemCategory } from '../../../src/modules/assessment/domain/value-objects/assessment-enums';

/** In-memory copy of the standard 22-item template seeded by migration. */
export const buildStandardTemplate = (): AssessmentTemplate => {
  const mk = (
    code: string,
    label: string,
    category: ItemCategory,
    sortOrder: number,
  ) => ({ id: `tpl-item-${code}`, code, label, category, required: true, sortOrder });
  const hardware = [
    'screen', 'keyboard', 'battery', 'charger', 'mouse', 'webcam',
    'speakers', 'microphone', 'usb_ports', 'hdmi', 'wifi', 'bluetooth',
  ];
  const software = [
    'operating_system', 'antivirus', 'encryption', 'company_software',
    'disk_encryption', 'asset_sticker',
  ];
  const condition = [
    'water_damage', 'physical_damage', 'missing_components', 'boots_successfully',
  ];
  let sort = 0;
  return AssessmentTemplate.hydrate({
    id: 'tpl-1',
    key: 'standard-device-assessment',
    version: 1,
    name: 'Standard Device Assessment',
    description: null,
    isActive: true,
    createdAt: new Date(),
    items: [
      ...hardware.map((c) => mk(c, c, 'Hardware', ++sort)),
      ...software.map((c) => mk(c, c, 'Software', ++sort)),
      ...condition.map((c) => mk(c, c, 'Condition', ++sort)),
    ],
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
