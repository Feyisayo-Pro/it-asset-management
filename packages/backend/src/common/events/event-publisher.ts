import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './base-event';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger('EventPublisher');

  constructor(private readonly emitter: EventEmitter2) {}

  publish<T>(event: DomainEvent<T>): void {
    this.logger.debug(
      `[${event.correlationId}] emit ${event.name} (${event.eventId})`,
    );
    this.emitter.emit(event.name, event);
  }
}
