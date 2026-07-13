import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance } from '../../domain/entities/workflow-instance.entity';
import { WorkflowInstanceTransition } from '../../domain/entities/workflow-transition.entity';
import { WorkflowInstanceRepository } from '../../domain/repositories/workflow.repositories';
import { WorkflowInstanceOrmEntity } from '../typeorm-entities/workflow-instance.orm-entity';
import { WorkflowInstanceTransitionOrmEntity } from '../typeorm-entities/workflow-instance-transition.orm-entity';

@Injectable()
export class TypeOrmWorkflowInstanceRepository implements WorkflowInstanceRepository {
  constructor(
    @InjectRepository(WorkflowInstanceOrmEntity)
    private readonly repo: Repository<WorkflowInstanceOrmEntity>,
    @InjectRepository(WorkflowInstanceTransitionOrmEntity)
    private readonly transitionRepo: Repository<WorkflowInstanceTransitionOrmEntity>,
  ) {}

  async findById(id: string): Promise<WorkflowInstance | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySubject(subjectType: string, subjectId: string): Promise<WorkflowInstance | null> {
    const row = await this.repo.findOne({ where: { subjectType, subjectId } });
    return row ? this.toDomain(row) : null;
  }

  async save(instance: WorkflowInstance): Promise<WorkflowInstance> {
    const p = instance.toPersistence();
    const row = new WorkflowInstanceOrmEntity();
    row.id = p.id;
    row.definitionId = p.definitionId;
    row.subjectType = p.subjectType;
    row.subjectId = p.subjectId;
    row.currentState = p.currentState;
    row.startedByUserId = p.startedByUserId;
    row.startedAt = p.startedAt;
    row.currentStageEnteredAt = p.currentStageEnteredAt;
    row.completedAt = p.completedAt;
    row.bypassed = p.bypassed;
    row.bypassedByUserId = p.bypassedByUserId;
    row.bypassReason = p.bypassReason;
    row.createdAt = p.createdAt;
    row.updatedAt = p.updatedAt;
    await this.repo.upsert(row, ['id']);
    return instance;
  }

  async appendTransition(transition: WorkflowInstanceTransition): Promise<void> {
    const p = transition.toPersistence();
    const row = new WorkflowInstanceTransitionOrmEntity();
    row.id = p.id;
    row.instanceId = p.instanceId;
    row.fromState = p.fromState;
    row.toState = p.toState;
    row.actionName = p.actionName;
    row.actorUserId = p.actorUserId;
    row.signatureName = p.signatureName;
    row.signatureIp = p.signatureIp;
    row.evidenceFileIds = p.evidenceFileIds;
    row.comment = p.comment;
    row.occurredAt = p.occurredAt;
    await this.transitionRepo.insert(row);
  }

  async listTransitions(instanceId: string): Promise<WorkflowInstanceTransition[]> {
    const rows = await this.transitionRepo.find({
      where: { instanceId },
      order: { occurredAt: 'ASC' },
    });
    return rows.map((r) =>
      WorkflowInstanceTransition.hydrate({
        id: r.id,
        instanceId: r.instanceId,
        fromState: r.fromState,
        toState: r.toState,
        actionName: r.actionName,
        actorUserId: r.actorUserId,
        occurredAt: r.occurredAt,
        signatureName: r.signatureName,
        signatureIp: r.signatureIp,
        evidenceFileIds: r.evidenceFileIds,
        comment: r.comment,
      }),
    );
  }

  async listPendingForRole(_roleName: string): Promise<WorkflowInstance[]> {
    // Cheap implementation: everything not-completed. Downstream
    // consumers filter by their role from the returned availableActions.
    // Optimized query lives with the M4 Allocation module.
    const rows = await this.repo.find({ where: { completedAt: undefined } });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: WorkflowInstanceOrmEntity): WorkflowInstance {
    return WorkflowInstance.hydrate({
      id: row.id,
      definitionId: row.definitionId,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      currentState: row.currentState,
      startedByUserId: row.startedByUserId,
      startedAt: row.startedAt,
      currentStageEnteredAt: row.currentStageEnteredAt,
      completedAt: row.completedAt,
      bypassed: row.bypassed,
      bypassedByUserId: row.bypassedByUserId,
      bypassReason: row.bypassReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
