import { Inject, Injectable } from '@nestjs/common';
import {
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { TransitionWorkflowUseCase } from '../../../workflow/application/use-cases/transition-workflow.use-case';
import { ReturnRecord } from '../../domain/entities/return-record.entity';
import { ReturnNotFoundError } from '../../../../common/errors/return.errors';
import { asyncContext } from '../../../../common/utils/async-context';

export type SignAction = 'sign-employee' | 'sign-it' | 'sign-pc' | 'cancel';

export interface SignReturnCommand {
  returnId: string;
  actionName: SignAction;
  actorUserId: string;
  actorRole: string;
  signatureName?: string;
  comment?: string;
}

/**
 * Executes signature (or cancel) transitions. Which roles may perform
 * which action, and whether a signature/comment is required, is
 * entirely the workflow definition's decision — this use case only
 * carries the payload and syncs the read model.
 */
@Injectable()
export class SignReturnUseCase {
  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly transition: TransitionWorkflowUseCase,
  ) {}

  async execute(command: SignReturnCommand): Promise<ReturnRecord> {
    const record = await this.returns.findById(command.returnId);
    if (!record || !record.workflowInstanceId) {
      throw new ReturnNotFoundError(command.returnId);
    }

    const instance = await this.transition.execute({
      instanceId: record.workflowInstanceId,
      actionName: command.actionName,
      actorUserId: command.actorUserId,
      actorRole: command.actorRole,
      signatureName: command.signatureName,
      signatureIp: asyncContext.get()?.ip,
      comment: command.comment,
    });

    record.syncState(instance.currentState, this.clock.now());
    await this.returns.save(record);
    return record;
  }
}
