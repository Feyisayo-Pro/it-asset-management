export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    correlationId?: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly correlationId?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
