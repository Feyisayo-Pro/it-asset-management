import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
} from '../../domain/repositories/assessment.repositories';
import {
  ASSET_REPOSITORY,
  AssetRepository,
} from '../../../asset/domain/repositories/asset.repository';
import { ID_GENERATOR, IdGenerator } from '../../../auth/application/ports/id-generator.port';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import {
  AssessmentContextType,
  STANDARD_TEMPLATE_KEY,
} from '../../domain/value-objects/assessment-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssessmentStartedEvent } from '../../domain/events/assessment.events';
import { AssessmentTemplateNotFoundError } from '../../../../common/errors/assessment.errors';
import { AssetNotFoundError } from '../../../../common/errors/asset.errors';

export interface StartAssessmentCommand {
  assetId: string;
  technicianUserId: string;
  contextType?: AssessmentContextType;
  contextId?: string | null;
  /** Defaults to the seeded standard template. */
  templateKey?: string;
}

@Injectable()
export class StartAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_TEMPLATE_REPOSITORY)
    private readonly templates: AssessmentTemplateRepository,
    @Inject(ASSESSMENT_RECORD_REPOSITORY)
    private readonly records: AssessmentRecordRepository,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: StartAssessmentCommand): Promise<AssessmentRecord> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) throw new AssetNotFoundError(command.assetId);

    const key = command.templateKey ?? STANDARD_TEMPLATE_KEY;
    const template = await this.templates.findLatestByKey(key);
    if (!template) throw new AssessmentTemplateNotFoundError(key);

    const record = AssessmentRecord.start({
      id: this.ids.next(),
      templateId: template.id,
      assetId: asset.id,
      contextType: command.contextType ?? 'Standalone',
      contextId: command.contextId ?? null,
      technicianUserId: command.technicianUserId,
      now: this.clock.now(),
    });
    await this.records.save(record);

    this.events.publish(
      new AssessmentStartedEvent({
        id: record.id,
        assetId: record.assetId,
        contextType: record.contextType,
        contextId: record.contextId,
        technicianUserId: record.technicianUserId,
      }),
    );
    return record;
  }
}
