import { WeakPasswordError } from '../../../../common/errors/auth.errors';

/**
 * PasswordPolicy — the single arbiter of what a valid new password
 * looks like. Kept as a pure static class so use cases can enforce
 * it without a DI hop, and tests can call it directly.
 */
export class PasswordPolicy {
  static readonly MIN_LENGTH = 12;
  static readonly MAX_LENGTH = 128;

  static assertValid(candidate: string): void {
    if (candidate.length < this.MIN_LENGTH) {
      throw new WeakPasswordError(`minimum length is ${this.MIN_LENGTH}`);
    }
    if (candidate.length > this.MAX_LENGTH) {
      throw new WeakPasswordError(`maximum length is ${this.MAX_LENGTH}`);
    }
    if (!/[a-z]/.test(candidate)) {
      throw new WeakPasswordError('missing lowercase letter');
    }
    if (!/[A-Z]/.test(candidate)) {
      throw new WeakPasswordError('missing uppercase letter');
    }
    if (!/[0-9]/.test(candidate)) {
      throw new WeakPasswordError('missing digit');
    }
    if (!/[^A-Za-z0-9]/.test(candidate)) {
      throw new WeakPasswordError('missing symbol');
    }
    if (/\s/.test(candidate)) {
      throw new WeakPasswordError('whitespace not allowed');
    }
  }
}
