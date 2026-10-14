import { isAxiosError } from 'axios';

export type ApiErrorKind =
  | 'validation'
  | 'invalid_credentials'
  | 'network'
  | 'server'
  | 'unknown';

export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly correlationId?: string;
  readonly responseData?: unknown;
  readonly fieldErrors?: Record<string, string>;

  constructor({
    kind,
    message,
    status,
    correlationId,
    responseData,
    fieldErrors,
  }: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    correlationId?: string;
    responseData?: unknown;
    fieldErrors?: Record<string, string>;
  }) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.status = status;
    this.correlationId = correlationId;
    this.responseData = responseData;
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

type ErrorPayload = {
  message?: string;
  statusCode?: number;
  correlationId?: string;
  errors?: Record<string, string | string[]>;
};

export function normalizeApiError(error: unknown): ApiRequestError {
  if (!isAxiosError<ErrorPayload>(error)) {
    return new ApiRequestError({
      kind: 'unknown',
      message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      responseData: error,
    });
  }

  if (!error.response) {
    return new ApiRequestError({
      kind: 'network',
      message: error.message || 'Unable to reach the service. Check your connection and try again.',
      responseData: error.request ? '[No response received]' : undefined,
    });
  }

  const payload = error.response.data;
  const status = payload?.statusCode ?? error.response.status;
  const fieldErrors = payload?.errors
    ? Object.fromEntries(
        Object.entries(payload.errors).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      )
    : undefined;

  let kind: ApiErrorKind = 'unknown';
  if (status === 400 || status === 422) kind = 'validation';
  if (status === 401) kind = 'invalid_credentials';
  if (status >= 500) kind = 'server';

  const message = typeof payload === 'string'
    ? payload
    : payload?.message ?? error.message ?? 'The request could not be completed.';

  return new ApiRequestError({
    kind,
    message,
    status,
    correlationId: payload?.correlationId,
    responseData: payload,
    fieldErrors,
  });
}
