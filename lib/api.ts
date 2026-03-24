export type TransformErrorCode =
  | 'VALIDATION_ERROR'
  | 'FETCH_ERROR'
  | 'HTTP_ERROR'
  | 'ABORTED'
  | 'QUEUE_FULL'
  | 'INTERNAL_ERROR';

export interface TransformErrorDetails {
  retryAfter?: number | string | null;
  timeout?: number;
  reason?: string;
}

export interface TransformError {
  code: TransformErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
  details?: TransformErrorDetails;
}

export interface TransformMetadata {
  description?: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
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
  type: 'progress';
  progress: number;
  total: number;
  message: string;
}

export type StreamResultEvent = { type: 'result' } & TransformResponse;

export type StreamEvent = StreamProgressEvent | StreamResultEvent;

export const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
export const STREAM_PROGRESS_TOTAL = 8;
type TransformErrorOptions = Omit<TransformError, 'code' | 'message'>;

export type JsonRecord = Record<string, unknown>;

export function createTransformError(
  code: TransformErrorCode,
  message: string,
  options: Partial<TransformErrorOptions> = {}
): TransformError {
  return {
    code,
    message,
    retryable: options.retryable ?? false,
    ...(options.statusCode !== undefined
      ? { statusCode: options.statusCode }
      : {}),
    ...(options.details !== undefined ? { details: options.details } : {}),
  };
}

export function createInternalError(
  message: string,
  retryable = false
): TransformError {
  return createTransformError('INTERNAL_ERROR', message, { retryable });
}

function createNetworkError(): TransformError {
  return createInternalError('Network error. Please try again.', true);
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

function resolveProgressTotal(
  total: number | undefined,
  fallback = STREAM_PROGRESS_TOTAL
): number {
  return total !== undefined && total > 0 ? total : fallback;
}

export function createStreamProgressEvent(
  progress: number,
  total?: number,
  message?: string
): StreamProgressEvent {
  return {
    type: 'progress',
    progress,
    total: resolveProgressTotal(total),
    message: message ?? '',
  };
}

export function normalizeStreamProgressEvent(
  event: StreamProgressEvent,
  previous?: StreamProgressEvent | null
): StreamProgressEvent {
  const total = resolveProgressTotal(event.total, previous?.total);
  const progress = Math.max(event.progress, previous?.progress ?? 0);

  return createStreamProgressEvent(progress, total, event.message);
}

export function createStreamResultEvent(
  response: TransformResponse
): StreamResultEvent {
  return { type: 'result', ...response };
}

export function isNdjsonContentType(contentType: string | null): boolean {
  return (contentType ?? '').includes(NDJSON_CONTENT_TYPE);
}

export function isTerminalStreamProgressEvent(
  event: StreamProgressEvent
): boolean {
  return event.progress >= event.total;
}

export function isStreamProgressEvent(
  event: StreamEvent
): event is StreamProgressEvent {
  return event.type === 'progress';
}

export function isStreamResultEvent(
  event: StreamEvent
): event is StreamResultEvent {
  return event.type === 'result';
}

export function hasTransformResult(
  response: TransformResponse
): response is TransformSuccessResponse {
  return response.ok && response.result != null;
}

export function hasTransformError(
  response: TransformResponse
): response is TransformErrorResponse {
  return !response.ok && response.error != null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value == null || typeof value === 'string';
}

function isTransformMetadata(value: unknown): value is TransformMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.description) &&
    isOptionalString(value.author) &&
    isOptionalString(value.publishedAt) &&
    isOptionalString(value.modifiedAt) &&
    isOptionalString(value.image) &&
    isOptionalString(value.favicon)
  );
}

function isTransformResult(value: unknown): value is TransformResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.url === 'string' &&
    isOptionalString(value.resolvedUrl) &&
    isOptionalString(value.finalUrl) &&
    isOptionalString(value.title) &&
    isTransformMetadata(value.metadata) &&
    typeof value.markdown === 'string' &&
    typeof value.fromCache === 'boolean' &&
    typeof value.fetchedAt === 'string' &&
    isFiniteNumber(value.contentSize) &&
    typeof value.truncated === 'boolean'
  );
}

function isStreamEventType(type: unknown): type is StreamEvent['type'] {
  return type === 'progress' || type === 'result';
}

function isStreamProgressEventPayload(value: JsonRecord): boolean {
  return (
    isFiniteNumber(value.progress) &&
    isFiniteNumber(value.total) &&
    typeof value.message === 'string'
  );
}

function isTransformSuccessResponse(
  value: unknown
): value is TransformSuccessResponse {
  return (
    isRecord(value) && value.ok === true && isTransformResult(value.result)
  );
}

function isTransformResponse(value: unknown): value is TransformResponse {
  return isTransformSuccessResponse(value) || isTransformErrorResponse(value);
}

export function isStreamEvent(value: unknown): value is StreamEvent {
  if (!isRecord(value) || !isStreamEventType(value.type)) {
    return false;
  }

  return value.type === 'progress'
    ? isStreamProgressEventPayload(value)
    : isTransformResponse(value);
}

export function isTransformError(value: unknown): value is TransformError {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.retryable === 'boolean'
  );
}

function isNamedError(error: unknown, name: string): boolean {
  if (error instanceof Error && error.name === name) return true;
  // Browser DOMException might not inherit from Error in older environments,
  // but it's an object with a name property.
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === name
  );
}

export function isAbortError(error: unknown): boolean {
  return isNamedError(error, 'AbortError');
}

export function isTimeoutError(error: unknown): boolean {
  return isNamedError(error, 'TimeoutError');
}

export function isTransformErrorResponse(
  value: unknown
): value is TransformErrorResponse {
  if (!isRecord(value) || value.ok !== false) {
    return false;
  }

  return isTransformError(value.error);
}

export function mapClientTransformError(error: unknown): TransformError {
  if (isTimeoutError(error)) return createTimeoutError();
  if (isAbortError(error))
    return createTransformError('ABORTED', 'Request was cancelled.');
  if (isTransformError(error)) return error;
  return createNetworkError();
}
