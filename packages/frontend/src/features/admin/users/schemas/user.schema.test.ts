import { describe, it, expect } from 'vitest';
import { createUserSchema, editUserSchema } from './user.schema';

const roleId = '11111111-2222-3333-4444-555555555555';

describe('createUserSchema', () => {
  it('accepts a valid payload', () => {
    const result = createUserSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      roleId,
      password: 'Str0ng-Pass!word',
      confirmPassword: 'Str0ng-Pass!word',
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['no uppercase', 'str0ng-pass!word'],
    ['no lowercase', 'STR0NG-PASS!WORD'],
    ['no digit', 'Strong-Password!'],
    ['no symbol', 'Str0ngPassword12'],
    ['too short', 'Aa1!aaaa'],
    ['whitespace', 'Str0ng Pass!word'],
  ])('rejects password with %s', (_label, password) => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      roleId,
      password,
      confirmPassword: password,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when passwords do not match', () => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      roleId,
      password: 'Str0ng-Pass!word',
      confirmPassword: 'Different-Pass!word1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('confirmPassword')),
      ).toBe(true);
    }
  });

  it('rejects an invalid roleId', () => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      roleId: 'not-a-uuid',
      password: 'Str0ng-Pass!word',
      confirmPassword: 'Str0ng-Pass!word',
    });
    expect(result.success).toBe(false);
  });
});

describe('editUserSchema', () => {
  it('accepts a valid edit payload', () => {
    expect(
      editUserSchema.safeParse({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty first name', () => {
    expect(
      editUserSchema.safeParse({
        firstName: '   ',
        lastName: 'X',
        email: 'a@b.co',
      }).success,
    ).toBe(false);
  });
});
