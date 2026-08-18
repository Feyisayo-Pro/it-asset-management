import { AxiosError } from 'axios';
import { ApiError, ApiErrorEnvelope } from '@/types/api';

export const normalizeAxiosError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;
  const axiosErr = err as AxiosError<ApiErrorEnvelope>;
  const status = axiosErr.response?.status ?? 0;
  const envelope = axiosErr.response?.data;
  if (envelope?.error) {
    return new ApiError(
      status,
      envelope.error.code,
      envelope.error.message,
      envelope.error.correlationId,
      envelope.error.details,
    );
  }
  return new ApiError(
    status,
    'NETWORK_ERROR',
    axiosErr.message || 'Network error',
  );
};
