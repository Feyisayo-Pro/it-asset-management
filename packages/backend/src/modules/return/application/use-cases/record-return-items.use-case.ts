import { Inject, Injectable } from '@nestjs/common';
import {
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { TransitionWorkflowUseCase } from '../../../workflow/application/use-cases/transition-workflow.use-case';
import { ReturnRecord } from '../../domain/entities/return-record.entity';
import {
  ReturnItemStatus,
  ReturnItemType,
} from '../../domain/value-objects/return-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { ReturnItemsRecordedEvent } from '../../domain/events/return.events';
import { ReturnNotFoundError } from '../../../../common/errors/return.errors';

export interface RecordReturnItemsCommand {
  returnId: string;
  actorUserId: string;
  actorRole: string;
  items: Array<{
    itemType: ReturnItemType;
    description?: string | null;
    status: ReturnItemStatus;
    notes?: string | null;
  }>;
}

@Injectable()
export class RecordReturnItemsUseCase {
  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly transition: TransitionWorkflowUseCase,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RecordReturnItemsCommand): Promise<ReturnRecord> {
    const record = await this.returns.findById(command.returnId);
    if (!record || !record.workflowInstanceId) {
      throw new ReturnNotFoundError(command.returnId);
    }

    const now = this.clock.now();
    // Domain validation (non-empty, notes on Missing/Damaged) happens
    // inside the aggregate before we touch the workflow.
    record.recordItems(
      command.items.map((i) => ({
        itemType: i.itemType,
        description: i.description ?? null,
        status: i.status,
        notes: i.notes ?? null,
      })),
      () => this.ids.next(),
      now,
    );
    await this.returns.save(record);

    // The engine enforces state + role. If this throws, the items stay
    // saved on the still-Initiated record and the next attempt simply
    // overwrites them — no inconsistent state is possible.
    const instance = await this.transition.execute({
      instanceId: record.workflowInstanceId,
      actionName: 'record-items',
      actorUserId: command.actorUserId,
      actorRole: command.actorRole,
    });
    record.syncState(instance.currentState, now);
    await this.returns.save(record);

    const items = record.items;
    this.events.publish(
      new ReturnItemsRecordedEvent({
        id: record.id,
        assetId: record.assetId,
        itemCount: items.length,
        missingCount: items.filter((i) => i.status === 'Missing').length,
        damagedCount: items.filter((i) => i.status === 'Damaged').length,
      }),
    );

    return record;
  }
}
