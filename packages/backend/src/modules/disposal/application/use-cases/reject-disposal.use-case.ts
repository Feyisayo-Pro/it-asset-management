import { Inject, Injectable } from '@nestjs/common';
import {
  DISPOSAL_REPOSITORY,
  DisposalRepository,
} from '../../domain/repositories/disposal.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { DisposalRecord } from '../../domain/entities/disposal-record.entity';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { DisposalRejectedEvent } from '../../domain/events/disposal.events';
import { DisposalNotFoundError } from '../../../../common/errors/disposal.errors';

export interface RejectDisposalCommand {
  disposalId: string;
  approverUserId: string;
  rejectionReason: string;
}

@Injectable()
export class RejectDisposalUseCase {
  constructor(
    @Inject(DISPOSAL_REPOSITORY) private readonly disposals: DisposalRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: RejectDisposalCommand): Promise<DisposalRecord> {
    const record = await this.disposals.findById(command.disposalId);
    if (!record) throw new DisposalNotFoundError(command.disposalId);

    record.reject({
      approverUserId: command.approverUserId,
      rejectionReason: command.rejectionReason,
      now: this.clock.now(),
    });
    await this.disposals.save(record);

    this.events.publish(
      new DisposalRejectedEvent({
        id: record.id,
        assetId: record.assetId,
        approvedByUserId: command.approverUserId,
        rejectionReason: record.rejectionReason!,
      }),
    );
    return record;
  }
}
