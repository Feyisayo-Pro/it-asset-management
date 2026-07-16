import { Inject, Injectable } from '@nestjs/common';
import {
  DISPOSAL_REPOSITORY,
  DisposalRepository,
} from '../../domain/repositories/disposal.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { DisposalRecord } from '../../domain/entities/disposal-record.entity';
import { ApproverSignature } from '../../domain/value-objects/approver-signature';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { DisposalApprovedEvent } from '../../domain/events/disposal.events';
import { DisposalNotFoundError } from '../../../../common/errors/disposal.errors';

export interface ApproveDisposalCommand {
  disposalId: string;
  approverUserId: string;
  signaturePrintedName: string;
  signatureIp?: string | null;
  disposalDate: Date;
  witnessUserId?: string | null;
  approvalNotes?: string | null;
}

@Injectable()
export class ApproveDisposalUseCase {
  constructor(
    @Inject(DISPOSAL_REPOSITORY) private readonly disposals: DisposalRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: ApproveDisposalCommand): Promise<DisposalRecord> {
    const record = await this.disposals.findById(command.disposalId);
    if (!record) throw new DisposalNotFoundError(command.disposalId);

    const signature = ApproverSignature.create({
      printedName: command.signaturePrintedName,
      ip: command.signatureIp,
    });

    const now = this.clock.now();
    record.approve({
      approverUserId: command.approverUserId,
      signature,
      disposalDate: command.disposalDate,
      witnessUserId: command.witnessUserId,
      approvalNotes: command.approvalNotes,
      now,
    });
    await this.disposals.save(record);

    // Emit before flipping the asset — the handler consumes this and
    // routes the asset status change through ChangeAssetStatusUseCase.
    this.events.publish(
      new DisposalApprovedEvent({
        id: record.id,
        assetId: record.assetId,
        approvedByUserId: command.approverUserId,
        witnessUserId: record.witnessUserId,
        reason: record.reason,
        method: record.method,
        disposalDate: record.disposalDate!,
      }),
    );
    return record;
  }
}
