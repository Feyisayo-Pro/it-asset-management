import { Inject, Injectable } from '@nestjs/common';
import {
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../../asset/domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { CreateWorkflowInstanceUseCase } from '../../../workflow/application/use-cases/create-workflow-instance.use-case';
import { ReturnRecord } from '../../domain/entities/return-record.entity';
import {
  RETURN_SUBJECT_TYPE,
  RETURN_WORKFLOW_KEY,
  ReturnReason,
} from '../../domain/value-objects/return-enums';
import { AssetStatus } from '../../../asset/domain/value-objects/asset-status';
import { RoleName } from '../../../rbac/domain/enums/role-name.enum';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { ReturnInitiatedEvent } from '../../domain/events/return.events';
import {
  ActiveReturnExistsError,
  AssetNotReturnableError,
  NotAssetHolderError,
} from '../../../../common/errors/return.errors';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';

export interface InitiateReturnCommand {
  assetId: string;
  reason: ReturnReason;
  reasonNotes?: string | null;
  actorUserId: string;
  actorRole: string;
}

@Injectable()
export class InitiateReturnUseCase {
  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly createWorkflowInstance: CreateWorkflowInstanceUseCase,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: InitiateReturnCommand): Promise<ReturnRecord> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);

    if (asset.status !== AssetStatus.Allocated) {
      throw new AssetNotReturnableError(asset.id, asset.status);
    }

    // Employees may only return an asset assigned to them; P&C and SA
    // can initiate on anyone's behalf (offboarding).
    if (
      command.actorRole === RoleName.EMPLOYEE &&
      asset.currentHolderId !== command.actorUserId
    ) {
      throw new NotAssetHolderError();
    }

    const active = await this.returns.findActiveByAssetId(asset.id);
    if (active) throw new ActiveReturnExistsError(asset.id);

    const now = this.clock.now();
    const record = ReturnRecord.initiate({
      id: this.ids.next(),
      assetId: asset.id,
      holderUserId: asset.currentHolderId,
      initiatedByUserId: command.actorUserId,
      reason: command.reason,
      reasonNotes: command.reasonNotes ?? null,
      now,
    });
    await this.returns.save(record);

    const instance = await this.createWorkflowInstance.execute({
      definitionKey: RETURN_WORKFLOW_KEY,
      subjectType: RETURN_SUBJECT_TYPE,
      subjectId: record.id,
    });
    record.attachWorkflowInstance(instance.id, now);
    record.syncState(instance.currentState, now);
    await this.returns.save(record);

    this.events.publish(
      new ReturnInitiatedEvent({
        id: record.id,
        assetId: asset.id,
        reason: record.reason,
        initiatedByUserId: command.actorUserId,
      }),
    );

    return record;
  }
}
