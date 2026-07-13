import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { EventPublisher } from './events/event-publisher';

/**
 * CommonModule — wires the shared kernel. Middleware here runs for
 * every route; providers are exported so other modules can inject them.
 */
@Module({
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
