import type {
  StreamEvent,
  StreamProgressEvent,
  StreamResultEvent,
  TransformResponse,
} from '@/lib/api';

export const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
export const STREAM_PROGRESS_TOTAL = 8;

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
