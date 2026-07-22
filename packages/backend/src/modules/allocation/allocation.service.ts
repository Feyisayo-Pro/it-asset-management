import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AllocationOrmEntity } from './infrastructure/typeorm-entities/allocation.orm-entity';
import { CreateWorkflowInstanceUseCase } from '../workflow/application/use-cases/create-workflow-instance.use-case';
import { TransitionWorkflowUseCase } from '../workflow/application/use-cases/transition-workflow.use-case';
import { GetWorkflowStateUseCase } from '../workflow/application/use-cases/get-workflow-state.use-case';
import { ApplicationError } from '../../common/errors/domain.error';

export const ALLOCATION_WORKFLOW_KEY = 'asset-allocation';
export const ALLOCATION_SUBJECT_TYPE = 'Allocation';

export class AllocationNotFoundError extends ApplicationError {
  readonly code = 'ALLOCATION_NOT_FOUND';
  constructor(id: string) {
    super('Allocation not found', { id });
  }
}

export class AllocationNoWorkflowError extends ApplicationError {
  readonly code = 'ALLOCATION_NO_WORKFLOW';
  constructor(id: string) {
    super('Allocation has no workflow instance', { id });
  }
}

export interface AllocationDto {
  id: string;
  employeeId: string;
  employeeName: string | null;
  assetId: string | null;
  assetTag: string | null;
  workflowInstanceId: string | null;
  currentState: string;
  justification: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const toIso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

function toDto(e: AllocationOrmEntity): AllocationDto {
  return {
    id: e.id,
    employeeId: e.employeeId,
    employeeName: e.employee
      ? `${e.employee.firstName} ${e.employee.lastName}`
      : null,
    assetId: e.assetId,
    assetTag: e.asset?.assetTag ?? null,
    workflowInstanceId: e.workflowInstanceId,
    currentState: e.currentState,
    justification: e.justification,
    requestedBy: e.requestedBy,
    createdAt: toIso(e.createdAt),
    updatedAt: toIso(e.updatedAt),
  };
}

export interface ListAllocationsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(AllocationOrmEntity)
    private readonly repo: Repository<AllocationOrmEntity>,
    private readonly createWorkflow: CreateWorkflowInstanceUseCase,
    private readonly transitionWorkflow: TransitionWorkflowUseCase,
    private readonly getWorkflowState: GetWorkflowStateUseCase,
  ) {}

  async list(params: ListAllocationsParams) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'emp')
      .leftJoinAndSelect('a.asset', 'asset');

    if (params.search) {
      const like = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("LOWER(CONCAT(emp.first_name, ' ', emp.last_name)) LIKE :like", { like })
            .orWhere('LOWER(asset.asset_tag) LIKE :like', { like })
            .orWhere('LOWER(a.justification) LIKE :like', { like });
        }),
      );
    }
    if (params.status) {
      qb.andWhere('a.current_state = :status', { status: params.status });
    }

    qb.orderBy('a.createdAt', 'DESC');

    const page = Math.max(1, params.page);
    const pageSize = Math.min(500, Math.max(1, params.pageSize));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), page, pageSize, total };
  }

  async getById(id: string, actorRole: string) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['employee', 'asset'],
    });
    if (!row) throw new AllocationNotFoundError(id);

    const workflow = row.workflowInstanceId
      ? await this.getWorkflowState.execute(row.workflowInstanceId, actorRole)
      : null;

    return {
      allocation: toDto(row),
      workflow: workflow
        ? {
            currentState: workflow.instance.currentState,
            completedAt: workflow.instance.completedAt?.toISOString() ?? null,
            bypassed: workflow.instance.bypassed,
            availableActions: workflow.availableActions,
            stages: workflow.definition.stages.map((s) => ({
              state: s.state,
              label: s.label,
              sortOrder: s.sortOrder,
            })),
            history: workflow.history.map((h) => ({
              id: h.id,
              fromState: h.fromState,
              toState: h.toState,
              actionName: h.actionName,
              actorUserId: h.actorUserId,
              signatureName: h.signatureName,
              comment: h.comment,
              occurredAt: h.occurredAt.toISOString(),
            })),
          }
        : null,
    };
  }

  async create(input: {
    employeeId: string;
    justification?: string | null;
    requestedBy: string;
  }) {
    const entity = this.repo.create({
      employeeId: input.employeeId,
      justification: input.justification?.trim() || null,
      requestedBy: input.requestedBy,
      currentState: 'Requested',
    });
    const saved = await this.repo.save(entity);

    const instance = await this.createWorkflow.execute({
      definitionKey: ALLOCATION_WORKFLOW_KEY,
      subjectType: ALLOCATION_SUBJECT_TYPE,
      subjectId: saved.id,
    });

    saved.workflowInstanceId = instance.id;
    saved.currentState = instance.currentState;
    await this.repo.save(saved);

    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['employee', 'asset'],
    });
    return toDto(full!);
  }

  async assignAsset(id: string, assetId: string) {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new AllocationNotFoundError(id);
    entity.assetId = assetId;
    await this.repo.save(entity);
  }

  async transition(
    id: string,
    input: {
      actionName: string;
      actorUserId: string;
      actorRole: string;
      signatureName?: string;
      comment?: string;
    },
  ) {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['employee', 'asset'],
    });
    if (!entity) throw new AllocationNotFoundError(id);
    if (!entity.workflowInstanceId) {
      throw new AllocationNoWorkflowError(id);
    }

    const instance = await this.transitionWorkflow.execute({
      instanceId: entity.workflowInstanceId,
      actionName: input.actionName,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      signatureName: input.signatureName,
      comment: input.comment,
    });

    entity.currentState = instance.currentState;
    await this.repo.save(entity);

    return toDto(entity);
  }
}
