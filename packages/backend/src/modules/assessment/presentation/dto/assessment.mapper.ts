import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import { AssessmentTemplate } from '../../domain/entities/assessment-template.entity';

export const toTemplateDto = (t: AssessmentTemplate) => ({
  id: t.id,
  key: t.key,
  version: t.version,
  name: t.name,
  description: t.description,
  items: t.items.map((i) => ({
    code: i.code,
    label: i.label,
    category: i.category,
    required: i.required,
    sortOrder: i.sortOrder,
  })),
});

export const toAssessmentDto = (r: AssessmentRecord) => ({
  id: r.id,
  templateId: r.templateId,
  assetId: r.assetId,
  contextType: r.contextType,
  contextId: r.contextId,
  status: r.status,
  technicianUserId: r.technicianUserId,
  outcome: r.outcome,
  findings: r.findings,
  recommendations: r.recommendations,
  photoUrls: r.photoUrls,
  signatureName: r.signatureName,
  signatureIp: r.signatureIp,
  specNonComplianceOverride: r.specNonComplianceOverride,
  specOverrideJustification: r.specOverrideJustification,
  startedAt: r.startedAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
  results: r.results.map((res) => ({
    itemCode: res.itemCode,
    result: res.result,
    note: res.note,
  })),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
