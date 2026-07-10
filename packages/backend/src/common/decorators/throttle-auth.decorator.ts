import { Throttle } from '@nestjs/throttler';

/**
 * Wraps @Throttle() with the "auth" bucket defaults used on
 * login / forgot-password / reset-password endpoints — tighter than
 * global rate limits to blunt credential stuffing.
 */
export const ThrottleAuth = (): MethodDecorator & ClassDecorator =>
  Throttle({ auth: { limit: 10, ttl: 60_000 } });
