import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowDefinitionRepository } from '../../domain/repositories/workflow.repositories';
import { WorkflowDefinitionOrmEntity } from '../typeorm-entities/workflow-definition.orm-entity';
import { WorkflowStageOrmEntity } from '../typeorm-entities/workflow-stage.orm-entity';
import { WorkflowTransitionConfigOrmEntity } from '../typeorm-entities/workflow-transition-config.orm-entity';

@Injectable()
export class TypeOrmWorkflowDefinitionRepository implements WorkflowDefinitionRepository {
  constructor(
    @InjectRepository(WorkflowDefinitionOrmEntity)
    private readonly defRepo: Repository<WorkflowDefinitionOrmEntity>,
    @InjectRepository(WorkflowStageOrmEntity)
    private readonly stageRepo: Repository<WorkflowStageOrmEntity>,
    @InjectRepository(WorkflowTransitionConfigOrmEntity)
    private readonly transitionRepo: Repository<WorkflowTransitionConfigOrmEntity>,
  ) {}

  async findById(id: string): Promise<WorkflowDefinition | null> {
    const def = await this.defRepo.findOne({ where: { id } });
    if (!def) return null;
    return this.hydrateDefinition(def);
  }

  async findLatestByKey(key: string): Promise<WorkflowDefinition | null> {
    const def = await this.defRepo.findOne({
      where: { key, isActive: true },
      order: { version: 'DESC' },
    });
    if (!def) return null;
    return this.hydrateDefinition(def);
  }

  async listAll(): Promise<WorkflowDefinition[]> {
    const rows = await this.defRepo.find({
      order: { key: 'ASC', version: 'DESC' },
    });
    return Promise.all(rows.map((r) => this.hydrateDefinition(r)));
  }

  async save(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
    const props = definition.toPersistence();
    const defRow = new WorkflowDefinitionOrmEntity();
    defRow.id = props.id;
    defRow.key = props.key;
    defRow.version = props.version;
    defRow.name = props.name;
    defRow.description = props.description;
    defRow.isActive = props.isActive;
    defRow.initialState = props.initialState;
    defRow.finalStates = props.finalStates;
    defRow.createdAt = props.createdAt;
    defRow.updatedAt = props.updatedAt;
    await this.defRepo.upsert(defRow, ['id']);

    // Naive: delete + reinsert children. In v2 we'll version children
    // alongside the definition; for now definitions are seeded rarely.
    await this.stageRepo.delete({ definitionId: props.id });
    await this.transitionRepo.delete({ definitionId: props.id });

    for (const s of props.stages) {
      const row = new WorkflowStageOrmEntity();
      row.id = s.id;
      row.definitionId = props.id;
      row.state = s.state;
      row.label = s.label;
      row.requiredRoles = s.requiredRoles;
      row.slaMinutes = s.slaMinutes;
      row.sortOrder = s.sortOrder;
      await this.stageRepo.insert(row);
    }
    for (const t of props.transitions) {
      const row = new WorkflowTransitionConfigOrmEntity();
      row.id = t.id;
      row.definitionId = props.id;
      row.fromState = t.fromState;
      row.toState = t.toState;
      row.actionName = t.actionName;
      row.requiredRoles = t.requiredRoles;
      row.requiresSignature = t.requiresSignature;
      row.requiresEvidence = t.requiresEvidence;
      row.requiresComment = t.requiresComment;
      row.notificationRecipients = t.notificationRecipients;
      row.auditAction = t.auditAction;
      await this.transitionRepo.insert(row);
    }

    return definition;
  }

  private async hydrateDefinition(def: WorkflowDefinitionOrmEntity): Promise<WorkflowDefinition> {
    const [stages, transitions] = await Promise.all([
      this.stageRepo.find({
        where: { definitionId: def.id },
        order: { sortOrder: 'ASC' },
      }),
      this.transitionRepo.find({ where: { definitionId: def.id } }),
    ]);
    return WorkflowDefinition.hydrate({
      id: def.id,
      key: def.key,
      version: def.version,
      name: def.name,
      description: def.description,
      isActive: def.isActive,
      initialState: def.initialState,
      finalStates: def.finalStates,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
      stages: stages.map((s) => ({
        id: s.id,
        state: s.state,
        label: s.label,
        requiredRoles: s.requiredRoles,
        slaMinutes: s.slaMinutes,
        sortOrder: s.sortOrder,
      })),
      transitions: transitions.map((t) => ({
        id: t.id,
        fromState: t.fromState,
        toState: t.toState,
        actionName: t.actionName,
        requiredRoles: t.requiredRoles,
        requiresSignature: t.requiresSignature,
        requiresEvidence: t.requiresEvidence,
        requiresComment: t.requiresComment,
        notificationRecipients: t.notificationRecipients,
        auditAction: t.auditAction,
      })),
    });
  }
}
