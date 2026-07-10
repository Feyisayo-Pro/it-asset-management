import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApplicationError, DomainError } from '../errors/domain.error';
import { asyncContext } from '../utils/async-context';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    correlationId: string | undefined;
    details?: Record<string, unknown>;
  };
}

/**
 * Translates thrown errors into the API error envelope defined in
 * arch §18.2. Never leaks stack traces to clients.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = asyncContext.get()?.correlationId;

    const { status, code, message, details } = this.resolve(exception);

    const envelope: ErrorEnvelope = {
      error: { code, message, correlationId, details },
    };

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} → ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} → ${status} ${code}: ${message}`,
      );
    }

    response.status(status).json(envelope);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] })?.message as string) ??
            exception.message;
      const details =
        typeof raw === 'object' && raw
          ? { errors: (raw as { message?: string[] }).message }
          : undefined;
      return {
        status,
        code: httpCode(status),
        message: Array.isArray(message) ? message.join('; ') : message,
        details,
      };
    }
    if (exception instanceof DomainError || exception instanceof ApplicationError) {
      return {
        status: mapDomainToStatus(exception.code),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

function httpCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR';
  }
}

function mapDomainToStatus(code: string): number {
  if (code.startsWith('AUTH_INVALID')) return HttpStatus.UNAUTHORIZED;
  if (code === 'AUTH_ACCOUNT_LOCKED') return HttpStatus.UNAUTHORIZED;
  if (code === 'AUTH_ACCOUNT_DISABLED') return HttpStatus.UNAUTHORIZED;
  if (code === 'AUTH_WEAK_PASSWORD') return HttpStatus.BAD_REQUEST;
  if (code === 'AUTH_SAME_PASSWORD') return HttpStatus.BAD_REQUEST;
  return HttpStatus.BAD_REQUEST;
}
