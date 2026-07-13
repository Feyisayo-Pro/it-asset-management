import { Inject, Injectable } from '@nestjs/common';
import {
  ListReturnsParams,
  ListReturnsResult,
  RETURN_REPOSITORY,
  ReturnRepository,
} from '../../domain/repositories/return.repository';
import { ReturnRecord } from '../../domain/entities/return-record.entity';
import { GetWorkflowStateUseCase } from '../../../workflow/application/use-cases/get-workflow-state.use-case';
import { ReturnNotFoundError } from '../../../../common/errors/return.errors';

@Injectable()
export class GetReturnUseCase {
  constructor(
    @Inject(RETURN_REPOSITORY) private readonly returns: ReturnRepository,
    private readonly getWorkflowState: GetWorkflowStateUseCase,
  ) {}

  async byId(id: string, actorRole: string) {
    const record = await this.returns.findById(id);
    if (!record) throw new ReturnNotFoundError(id);
    const workflow = record.workflowInstanceId
      ? await this.getWorkflowState.execute(record.workflowInstanceId, actorRole)
      : null;
    return { record, workflow };
  }

  list(params: ListReturnsParams): Promise<ListReturnsResult> {
    return this.returns.list(params);
  }
}

export type { ReturnRecord };
