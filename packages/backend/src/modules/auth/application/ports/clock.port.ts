export const CLOCK = Symbol('CLOCK');

/**
 * Clock — injectable time source. Tests freeze this so lockout math,
 * token expiry, and audit timestamps are deterministic.
 */
export interface Clock {
  now(): Date;
}
