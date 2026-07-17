import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { EventPublisher } from './events/event-publisher';
import { HealthController } from './controllers/health.controller';

@Module({
  controllers: [HealthController],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
