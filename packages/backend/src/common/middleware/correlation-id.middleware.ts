import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { asyncContext } from '../utils/async-context';

const HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(HEADER);
    const correlationId = isValidCorrelationId(incoming)
      ? (incoming as string)
      : randomUUID();

    res.setHeader(HEADER, correlationId);

    asyncContext.run(
      {
        correlationId,
        ip: req.ip,
        userAgent: req.header('user-agent') ?? undefined,
      },
      () => next(),
    );
  }
}

function isValidCorrelationId(value: string | undefined): boolean {
  if (!value) return false;
  return /^[A-Za-z0-9._~\-]{8,64}$/.test(value);
}
