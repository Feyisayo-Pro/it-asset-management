import { User } from '../../../src/modules/auth/domain/entities/user.entity';

describe('User entity', () => {
  const t0 = new Date('2026-07-10T00:00:00Z');
  const build = (): User =>
    User.create({
      id: 'u1',
      email: 'A@Example.COM',
      firstName: 'First',
      lastName: 'Last',
      passwordHash: 'hash',
      roleId: 'r1',
    });

  it('normalizes email to lowercase on create', () => {
    expect(build().email).toBe('a@example.com');
  });

  it('increments failed attempts and locks at threshold', () => {
    const u = build();
    u.recordFailedLogin(t0, 3, 15);
    expect(u.failedLoginAttempts).toBe(1);
    expect(u.isLockedAt(t0)).toBe(false);

    u.recordFailedLogin(t0, 3, 15);
    u.recordFailedLogin(t0, 3, 15);
    expect(u.failedLoginAttempts).toBe(3);
    expect(u.isLockedAt(t0)).toBe(true);
    expect(u.lockedUntil?.getTime()).toBe(t0.getTime() + 15 * 60_000);
  });

  it('clears the lockout when the window has passed', () => {
    const u = build();
    for (let i = 0; i < 3; i += 1) u.recordFailedLogin(t0, 3, 15);
    expect(u.isLockedAt(t0)).toBe(true);

    const later = new Date(t0.getTime() + 16 * 60_000);
    u.clearLockoutIfExpired(later);
    expect(u.isLockedAt(later)).toBe(false);
    expect(u.failedLoginAttempts).toBe(0);
  });

  it('recording a successful login clears the counter', () => {
    const u = build();
    u.recordFailedLogin(t0, 3, 15);
    u.recordSuccessfulLogin(t0);
    expect(u.failedLoginAttempts).toBe(0);
    expect(u.lastLoginAt).toEqual(t0);
  });

  it('changing password clears lockout state and the must-change flag', () => {
    const u = User.create({
      id: 'u1',
      email: 'a@x',
      firstName: 'First',
      lastName: 'Last',
      passwordHash: 'hash',
      roleId: 'r1',
      mustChangePassword: true,
    });
    u.recordFailedLogin(t0, 3, 15);
    u.changePassword('new-hash', t0);
    expect(u.passwordHash).toBe('new-hash');
    expect(u.mustChangePassword).toBe(false);
    expect(u.failedLoginAttempts).toBe(0);
  });
});
