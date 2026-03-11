export type TransformErrorCode =
  | "VALIDATION_ERROR"
  | "FETCH_ERROR"
  | "HTTP_ERROR"
  | "ABORTED"
  | "QUEUE_FULL"
  | "INTERNAL_ERROR";

export interface TransformError {
  code: TransformErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
  details?: {
    retryAfter?: number | string | null;
    timeout?: number;
    reason?: string;
  };
}

export interface TransformMetadata {
  description?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  image?: string;
  favicon?: string;
}

export interface TransformResult {
  url: string;
  resolvedUrl?: string;
  finalUrl?: string;
  title?: string;
  metadata: TransformMetadata;
  markdown: string;
  fromCache: boolean;
  fetchedAt: string;
  contentSize: number;
  truncated: boolean;
}

export type TransformSuccessResponse = {
  ok: true;
  result: TransformResult;
};

export type TransformErrorResponse = {
  ok: false;
  error: TransformError;
};

export type TransformResponse =
  | TransformSuccessResponse
  | TransformErrorResponse;

export const NETWORK_ERROR_MESSAGE = "Network error. Please try again.";
export const UNEXPECTED_RESPONSE_MESSAGE = "Unexpected response format.";

type TransformErrorOptions = Omit<TransformError, "code" | "message">;

export function createTransformError(
  code: TransformErrorCode,
  message: string,
  options: Partial<TransformErrorOptions> = {},
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
  retryable = false,
): TransformError {
  return createTransformError("INTERNAL_ERROR", message, { retryable });
}

export function createNetworkError(): TransformError {
  return createInternalError(NETWORK_ERROR_MESSAGE, true);
}

export function createUnexpectedResponseError(): TransformError {
  return createInternalError(UNEXPECTED_RESPONSE_MESSAGE, false);
}

export function hasTransformResult(
  response: TransformResponse,
): response is TransformSuccessResponse {
  return response.ok && response.result != null;
}

export function hasTransformError(
  response: TransformResponse,
): response is TransformErrorResponse {
  return !response.ok && response.error != null;
}
