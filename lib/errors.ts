import type { TransformError, TransformErrorCode } from '@/lib/api';

type TransformErrorOptions = Omit<TransformError, 'code' | 'message'>;

export function createTransformError(
  code: TransformErrorCode,
  message: string,
  options: Partial<TransformErrorOptions> = {}
): TransformError {
  const error: TransformError = {
    code,
    message,
    retryable: options.retryable ?? false,
  };

  if (options.statusCode !== undefined) {
    error.statusCode = options.statusCode;
  }

  if (options.details !== undefined) {
    error.details = options.details;
  }

  return error;
}

export function createInternalError(
  message: string,
  retryable = false
): TransformError {
  return createTransformError('INTERNAL_ERROR', message, { retryable });
}

export function createTimeoutError(): TransformError {
  return createTransformError(
    'ABORTED',
    'Request timed out. Please try again.',
    {
      retryable: true,
    }
  );
}

export function createUnexpectedResponseError(): TransformError {
  return createInternalError('Unexpected response format.', false);
}
