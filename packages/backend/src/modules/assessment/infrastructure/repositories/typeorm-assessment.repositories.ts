import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssessmentTemplate,
} from '../../domain/entities/assessment-template.entity';
import {
  AssessmentRecord,
  AssessmentRecordProps,
} from '../../domain/entities/assessment-record.entity';
import {
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
  ListAssessmentsParams,
  ListAssessmentsResult,
} from '../../domain/repositories/assessment.repositories';
import {
  AssessmentItemResultOrmEntity,
  AssessmentRecordOrmEntity,
  AssessmentTemplateItemOrmEntity,
  AssessmentTemplateOrmEntity,
} from '../typeorm-entities/assessment.orm-entities';
import {
  AssessmentContextType,
  AssessmentOutcome,
  AssessmentStatus,
  ItemCategory,
  ItemResult,
} from '../../domain/value-objects/assessment-enums';

@Injectable()
export class TypeOrmAssessmentTemplateRepository implements AssessmentTemplateRepository {
  constructor(
    @InjectRepository(AssessmentTemplateOrmEntity)
    private readonly repo: Repository<AssessmentTemplateOrmEntity>,
    @InjectRepository(AssessmentTemplateItemOrmEntity)
    private readonly itemRepo: Repository<AssessmentTemplateItemOrmEntity>,
  ) {}

  async findById(id: string): Promise<AssessmentTemplate | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.hydrate(row) : null;
  }

  async findLatestByKey(key: string): Promise<AssessmentTemplate | null> {
    const row = await this.repo.findOne({
      where: { key, isActive: true },
      order: { version: 'DESC' },
    });
    return row ? this.hydrate(row) : null;
  }

  async listActive(): Promise<AssessmentTemplate[]> {
    const rows = await this.repo.find({
      where: { isActive: true },
      order: { key: 'ASC', version: 'DESC' },
    });
    return Promise.all(rows.map((r) => this.hydrate(r)));
  }

  private async hydrate(row: AssessmentTemplateOrmEntity): Promise<AssessmentTemplate> {
    const items = await this.itemRepo.find({
      where: { templateId: row.id },
      order: { sortOrder: 'ASC' },
    });
    return AssessmentTemplate.hydrate({
      id: row.id,
      key: row.key,
      version: row.version,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      items: items.map((i) => ({
        id: i.id,
        code: i.code,
        label: i.label,
        category: i.category as ItemCategory,
        required: i.required,
        sortOrder: i.sortOrder,
      })),
    });
  }
}

@Injectable()
export class TypeOrmAssessmentRecordRepository implements AssessmentRecordRepository {
  constructor(
    @InjectRepository(AssessmentRecordOrmEntity)
    private readonly repo: Repository<AssessmentRecordOrmEntity>,
    @InjectRepository(AssessmentItemResultOrmEntity)
    private readonly resultRepo: Repository<AssessmentItemResultOrmEntity>,
  ) {}

  async findById(id: string): Promise<AssessmentRecord | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.hydrate(row) : null;
  }

  async list(params: ListAssessmentsParams): Promise<ListAssessmentsResult> {
    const qb = this.repo.createQueryBuilder('a');
    if (params.assetId) qb.andWhere('a.asset_id = :assetId', { assetId: params.assetId });
    if (params.status) qb.andWhere('a.status = :status', { status: params.status });
    if (params.contextType) {
      qb.andWhere('a.context_type = :ct', { ct: params.contextType });
    }
    if (params.contextId) qb.andWhere('a.context_id = :ci', { ci: params.contextId });
    if (params.technicianUserId) {
      qb.andWhere('a.technician_user_id = :tid', { tid: params.technicianUserId });
    }
    qb.orderBy('a.created_at', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const data = await Promise.all(rows.map((r) => this.hydrate(r)));
    return { data, page, pageSize, total };
  }

  async save(record: AssessmentRecord): Promise<AssessmentRecord> {
    const props = record.toPersistence();
    const row = new AssessmentRecordOrmEntity();
    row.id = props.id;
    row.templateId = props.templateId;
    row.assetId = props.assetId;
    row.contextType = props.contextType;
    row.contextId = props.contextId;
    row.status = props.status;
    row.technicianUserId = props.technicianUserId;
    row.outcome = props.outcome;
    row.findings = props.findings;
    row.recommendations = props.recommendations;
    row.photoUrls = props.photoUrls;
    row.signatureName = props.signatureName;
    row.signatureIp = props.signatureIp;
    row.startedAt = props.startedAt;
    row.completedAt = props.completedAt;
    row.specNonComplianceOverride = props.specNonComplianceOverride;
    row.specOverrideJustification = props.specOverrideJustification;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    await this.repo.save(row);

    await this.resultRepo.delete({ recordId: props.id });
    for (const r of props.results) {
      const resultRow = new AssessmentItemResultOrmEntity();
      resultRow.id = r.id;
      resultRow.recordId = props.id;
      resultRow.itemCode = r.itemCode;
      resultRow.result = r.result;
      resultRow.note = r.note;
      await this.resultRepo.insert(resultRow);
    }
    return record;
  }

  private async hydrate(row: AssessmentRecordOrmEntity): Promise<AssessmentRecord> {
    const results = await this.resultRepo.find({ where: { recordId: row.id } });
    const props: AssessmentRecordProps = {
      id: row.id,
      templateId: row.templateId,
      assetId: row.assetId,
      contextType: row.contextType as AssessmentContextType,
      contextId: row.contextId,
      status: row.status as AssessmentStatus,
      technicianUserId: row.technicianUserId,
      outcome: (row.outcome as AssessmentOutcome | null) ?? null,
      findings: row.findings,
      recommendations: row.recommendations,
      photoUrls: row.photoUrls,
      signatureName: row.signatureName,
      signatureIp: row.signatureIp,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      specNonComplianceOverride: row.specNonComplianceOverride,
      specOverrideJustification: row.specOverrideJustification,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      results: results.map((r) => ({
        id: r.id,
        itemCode: r.itemCode,
        result: r.result as ItemResult,
        note: r.note,
      })),
    };
    return AssessmentRecord.hydrate(props);
  }
}
