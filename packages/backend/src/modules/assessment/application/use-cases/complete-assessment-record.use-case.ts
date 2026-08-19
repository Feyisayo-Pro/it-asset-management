import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_RECORD_REPOSITORY,
  ASSESSMENT_TEMPLATE_REPOSITORY,
  AssessmentRecordRepository,
  AssessmentTemplateRepository,
} from '../../domain/repositories/assessment.repositories';
import { CLOCK, Clock } from '../../../auth/application/ports/clock.port';
import { AssessmentRecord } from '../../domain/entities/assessment-record.entity';
import {
  AssessmentContextType,
  AssessmentOutcome,
} from '../../domain/value-objects/assessment-enums';
import { EventPublisher } from '../../../../common/events/event-publisher';
import { AssessmentCompletedEvent } from '../../domain/events/assessment.events';
import {
  AssessmentNotFoundError,
  AssessmentTemplateNotFoundError,
  HardwareSpecNonComplianceError,
  SpecOverrideJustificationRequiredError,
} from '../../../../common/errors/assessment.errors';
import { asyncContext } from '../../../../common/utils/async-context';
import {
  DeviceSpec,
  HardwareSpecValidator,
} from '../../../asset/domain/services/hardware-spec-validator';

export interface CompleteAssessmentRecordCommand {
  assessmentId: string;
  outcome: AssessmentOutcome;
  findings: string;
  recommendations?: string | null;
  photoUrls?: string[] | null;
  signatureName: string;
  /**
   * Both optional, and only consulted when the assessment's context is
   * Allocation — this is the "IT Technical Assessment" step (per
   * docs/22-sapphire-virtual-source-data.md SOP A step 2/5) for a
   * device about to be handed to someone at this role level. Omitting
   * either simply skips the spec check; nothing else about completion
   * changes.
   */
  targetRoleLevel?: string;
  deviceSpec?: DeviceSpec;
  /**
   * Required to proceed when the spec check (above) finds the device
   * below the target role level's minimum — see
   * HardwareSpecNonComplianceError. Ignored (and never persisted as
   * true) when there was nothing to override.
   */
  specNonComplianceOverride?: boolean;
  specOverrideJustification?: string;
}

export interface CompleteAssessmentRecordResult {
  record: AssessmentRecord;
  /**
   * Advisories from HardwareSpecValidator. Non-empty means the device
   * was below the target role level's minimum — completion only
   * reached this point because it was either compliant or overridden
   * (see HardwareSpecNonComplianceError for the blocking case).
   */
  specWarnings: string[];
}

@Injectable()
export class CompleteAssessmentRecordUseCase {
  private readonly specValidator = new HardwareSpecValidator();

  constructor(
    @Inject(ASSESSMENT_RECORD_REPOSITORY)
    private readonly records: AssessmentRecordRepository,
    @Inject(ASSESSMENT_TEMPLATE_REPOSITORY)
    private readonly templates: AssessmentTemplateRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    command: CompleteAssessmentRecordCommand,
  ): Promise<CompleteAssessmentRecordResult> {
    const record = await this.records.findById(command.assessmentId);
    if (!record) throw new AssessmentNotFoundError(command.assessmentId);
    const template = await this.templates.findById(record.templateId);
    if (!template) throw new AssessmentTemplateNotFoundError(record.templateId);

    // Spec check runs BEFORE completing — a non-compliant result without
    // a valid override must block the write entirely, not just warn
    // after the fact.
    let specWarnings: string[] = [];
    if (
      record.contextType === AssessmentContextType.Allocation &&
      command.targetRoleLevel &&
      command.deviceSpec
    ) {
      specWarnings = this.specValidator.evaluate(
        command.targetRoleLevel,
        command.deviceSpec,
      ).warnings;
    }

    const overrideUsed = specWarnings.length > 0 && command.specNonComplianceOverride === true;
    if (specWarnings.length > 0 && !command.specNonComplianceOverride) {
      throw new HardwareSpecNonComplianceError(command.targetRoleLevel!, specWarnings);
    }
    if (overrideUsed && !command.specOverrideJustification?.trim()) {
      throw new SpecOverrideJustificationRequiredError();
    }

    record.complete(
      template,
      {
        outcome: command.outcome,
        findings: command.findings,
        recommendations: command.recommendations,
        photoUrls: command.photoUrls,
        signatureName: command.signatureName,
        signatureIp: asyncContext.get()?.ip ?? null,
        specNonComplianceOverride: overrideUsed,
        specOverrideJustification: overrideUsed ? command.specOverrideJustification : null,
      },
      this.clock.now(),
    );
    await this.records.save(record);

    this.events.publish(
      new AssessmentCompletedEvent({
        id: record.id,
        assetId: record.assetId,
        contextType: record.contextType,
        contextId: record.contextId,
        outcome: command.outcome,
        technicianUserId: record.technicianUserId,
        specWarnings,
        specNonComplianceOverride: overrideUsed,
        specOverrideJustification: overrideUsed ? (command.specOverrideJustification ?? null) : null,
      }),
    );

    return { record, specWarnings };
  }
}
