import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records the "Executive Override" flow for Allocation-context
 * assessments completed against a hardware-spec-non-compliant device —
 * see HardwareSpecNonComplianceError / CompleteAssessmentRecordUseCase.
 */
export class AddAssessmentSpecOverride1721400000000
  implements MigrationInterface
{
  name = 'AddAssessmentSpecOverride1721400000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "assessment_records" ADD COLUMN "spec_non_compliance_override" boolean NOT NULL DEFAULT false`,
    );
    await qr.query(
      `ALTER TABLE "assessment_records" ADD COLUMN "spec_override_justification" text`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "assessment_records" DROP COLUMN "spec_override_justification"`,
    );
    await qr.query(
      `ALTER TABLE "assessment_records" DROP COLUMN "spec_non_compliance_override"`,
    );
  }
}
