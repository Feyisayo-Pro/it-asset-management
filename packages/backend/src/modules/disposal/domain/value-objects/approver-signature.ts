import { DisposalApprovalSignatureRequiredError } from '../../../../common/errors/disposal.errors';

/**
 * Typed signature captured at approval time. We store the approver's
 * printed name plus the IP they signed from — that pair is a legally
 * defensible attestation for internal-asset disposal (see arch §8.8).
 * A future rev can layer a hashed drawn signature URL on top without
 * breaking the API.
 */
export class ApproverSignature {
  private constructor(
    readonly printedName: string,
    readonly ip: string | null,
  ) {}

  static create(input: { printedName: string; ip?: string | null }): ApproverSignature {
    const name = input.printedName?.trim();
    if (!name) throw new DisposalApprovalSignatureRequiredError();
    return new ApproverSignature(name, input.ip?.trim() || null);
  }
}
