import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { asyncContext } from '../utils/async-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = asyncContext.get()?.correlationId;
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
          this.logger.log(
            `[${correlationId}] ${request.method} ${request.url} → OK ${durationMs.toFixed(1)}ms`,
          );
        },
        error: () => {
          const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
          this.logger.log(
            `[${correlationId}] ${request.method} ${request.url} → ERR ${durationMs.toFixed(1)}ms`,
          );
        },
      }),
    );
  }
}
