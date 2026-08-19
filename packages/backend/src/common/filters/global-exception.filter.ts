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
  if (code === 'USER_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ROLE_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'DUPLICATE_EMAIL') return HttpStatus.CONFLICT;
  if (code === 'CANNOT_DEMOTE_LAST_ADMIN') return HttpStatus.CONFLICT;
  if (code === 'CANNOT_DEACTIVATE_LAST_ADMIN') return HttpStatus.CONFLICT;
  if (code === 'CANNOT_CHANGE_OWN_ROLE') return HttpStatus.FORBIDDEN;
  if (code === 'CANNOT_DEACTIVATE_SELF') return HttpStatus.FORBIDDEN;
  if (code === 'ASSET_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'DUPLICATE_ASSET_TAG') return HttpStatus.CONFLICT;
  if (code === 'INVALID_ASSET_TAG_FORMAT') return HttpStatus.BAD_REQUEST;
  if (code === 'DUPLICATE_SERIAL_NUMBER') return HttpStatus.CONFLICT;
  if (code === 'DUPLICATE_IMEI') return HttpStatus.CONFLICT;
  if (code === 'INVALID_ASSET_STATUS_TRANSITION') return HttpStatus.CONFLICT;
  if (code === 'ASSET_WARRANTY_BEFORE_PURCHASE') return HttpStatus.BAD_REQUEST;
  if (code === 'WORKFLOW_DEFINITION_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'WORKFLOW_INSTANCE_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'WORKFLOW_ALREADY_EXISTS') return HttpStatus.CONFLICT;
  if (code === 'WORKFLOW_ALREADY_COMPLETED') return HttpStatus.CONFLICT;
  if (code === 'INVALID_TRANSITION') return HttpStatus.CONFLICT;
  if (code === 'ROLE_NOT_ALLOWED_FOR_TRANSITION') return HttpStatus.FORBIDDEN;
  if (code === 'TRANSITION_REQUIRES_SIGNATURE') return HttpStatus.BAD_REQUEST;
  if (code === 'TRANSITION_REQUIRES_EVIDENCE') return HttpStatus.BAD_REQUEST;
  if (code === 'TRANSITION_REQUIRES_COMMENT') return HttpStatus.BAD_REQUEST;
  if (code === 'RETURN_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ASSET_NOT_RETURNABLE') return HttpStatus.CONFLICT;
  if (code === 'ACTIVE_RETURN_EXISTS') return HttpStatus.CONFLICT;
  if (code === 'NOT_ASSET_HOLDER') return HttpStatus.FORBIDDEN;
  if (code === 'RETURN_ITEMS_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'RETURN_ITEM_NOTES_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'ASSESSMENT_INCOMPLETE') return HttpStatus.BAD_REQUEST;
  if (code === 'ASSESSMENT_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ASSESSMENT_TEMPLATE_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ASSESSMENT_ALREADY_COMPLETED') return HttpStatus.CONFLICT;
  if (code === 'UNKNOWN_CHECKLIST_ITEM') return HttpStatus.BAD_REQUEST;
  if (code === 'CHECKLIST_INCOMPLETE') return HttpStatus.BAD_REQUEST;
  if (code === 'FAILED_ITEM_NOTE_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'ASSESSMENT_SIGNATURE_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'RECOMMENDATIONS_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'HARDWARE_SPEC_NON_COMPLIANCE') return HttpStatus.CONFLICT;
  if (code === 'SPEC_OVERRIDE_JUSTIFICATION_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'REPAIR_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ACTIVE_REPAIR_EXISTS') return HttpStatus.CONFLICT;
  if (code === 'INVALID_REPAIR_STATUS_TRANSITION') return HttpStatus.CONFLICT;
  if (code === 'REPAIR_ALREADY_TERMINAL') return HttpStatus.CONFLICT;
  if (code === 'REPAIR_COMPLETION_MISSING_DATA') return HttpStatus.BAD_REQUEST;
  if (code === 'DISPOSAL_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'ACTIVE_DISPOSAL_EXISTS') return HttpStatus.CONFLICT;
  if (code === 'ASSET_ALREADY_DISPOSED') return HttpStatus.CONFLICT;
  if (code === 'DISPOSAL_REQUESTER_CANNOT_APPROVE') return HttpStatus.FORBIDDEN;
  if (code === 'DISPOSAL_ALREADY_RESOLVED') return HttpStatus.CONFLICT;
  if (code === 'DISPOSAL_EVIDENCE_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'DISPOSAL_APPROVAL_SIGNATURE_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'DISPOSAL_REJECTION_REASON_REQUIRED') return HttpStatus.BAD_REQUEST;
  if (code === 'NOTIFICATION_NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (code === 'NOTIFICATION_ACCESS_DENIED') return HttpStatus.FORBIDDEN;
  return HttpStatus.BAD_REQUEST;
}
