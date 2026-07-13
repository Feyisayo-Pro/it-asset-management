import { randomUUID } from 'node:crypto';
import { asyncContext } from '../utils/async-context';

/**
 * DomainEvent — base class for all domain events. Enforces a shared
 * envelope so subscribers can route by name and correlate to the
 * originating request.
 */
export abstract class DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly correlationId: string | undefined;
  abstract readonly name: string;

  constructor(readonly payload: TPayload) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    this.correlationId = asyncContext.get()?.correlationId;
  }
}
