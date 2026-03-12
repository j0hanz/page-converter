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

export interface StreamProgressEvent {
  type: "progress";
  progress: number;
  total: number;
  message: string;
}

export type StreamResultEvent = { type: "result" } & TransformResponse;

export type StreamEvent = StreamProgressEvent | StreamResultEvent;

export const NDJSON_CONTENT_TYPE = "application/x-ndjson";
export const STREAM_PROGRESS_TOTAL = 8;
export const NETWORK_ERROR_MESSAGE = "Network error. Please try again.";
export const UNEXPECTED_RESPONSE_MESSAGE = "Unexpected response format.";

type TransformErrorOptions = Omit<TransformError, "code" | "message">;

type JsonRecord = Record<string, unknown>;

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

export const TIMEOUT_ERROR_MESSAGE = "Request timed out. Please try again.";

export function createTimeoutError(): TransformError {
  return createTransformError("ABORTED", TIMEOUT_ERROR_MESSAGE, {
    retryable: true,
  });
}

export function createUnexpectedResponseError(): TransformError {
  return createInternalError(UNEXPECTED_RESPONSE_MESSAGE, false);
}

function resolveProgressTotal(
  total: number | undefined,
  fallback = STREAM_PROGRESS_TOTAL,
): number {
  return total !== undefined && total > 0 ? total : fallback;
}

export function createStreamProgressEvent(
  progress: number,
  total?: number,
  message?: string,
): StreamProgressEvent {
  return {
    type: "progress",
    progress,
    total: resolveProgressTotal(total),
    message: message ?? "",
  };
}

export function normalizeStreamProgressEvent(
  event: StreamProgressEvent,
  previous?: StreamProgressEvent | null,
): StreamProgressEvent {
  const total = resolveProgressTotal(event.total, previous?.total);
  const progress = Math.max(event.progress, previous?.progress ?? 0);

  return {
    ...event,
    progress,
    total,
  };
}

export function isTerminalStreamProgressEvent(
  event: StreamProgressEvent,
): boolean {
  return event.progress >= event.total;
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function isTransformError(value: unknown): value is TransformError {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  );
}

export function isTransformErrorResponse(
  value: unknown,
): value is TransformErrorResponse {
  if (!isRecord(value) || value.ok !== false) {
    return false;
  }

  return isTransformError(value.error);
}
