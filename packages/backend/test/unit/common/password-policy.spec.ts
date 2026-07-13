import { PasswordPolicy } from '../../../src/modules/auth/domain/services/password-policy';
import { WeakPasswordError } from '../../../src/common/errors/auth.errors';

describe('PasswordPolicy', () => {
  it('accepts a policy-compliant password', () => {
    expect(() => PasswordPolicy.assertValid('Str0ng-Pass!word')).not.toThrow();
  });

  it.each([
    ['too short', 'Aa1!aaaa'],
    ['no uppercase', 'str0ng-pass!word'],
    ['no lowercase', 'STR0NG-PASS!WORD'],
    ['no digit', 'Strong-Password!'],
    ['no symbol', 'Str0ngPassword12'],
    ['has whitespace', 'Str0ng Pass!word'],
  ])('rejects when %s', (_label, candidate) => {
    expect(() => PasswordPolicy.assertValid(candidate)).toThrow(
      WeakPasswordError,
    );
  });
});
