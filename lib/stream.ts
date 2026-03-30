import type { Progress } from '@modelcontextprotocol/sdk/types.js';

import type {
  StreamEvent,
  StreamProgressEvent,
  StreamResultEvent,
  TransformResponse,
} from '@/lib/api';

export const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
export const STREAM_PROGRESS_TOTAL = 8;

export interface NdjsonStreamWriter {
  close: () => void;
  writeProgress: (event: StreamProgressEvent) => void;
  writeResult: (response: TransformResponse) => void;
}

export interface BufferedProgressEmitter {
  attachWriter: (writer: NdjsonStreamWriter) => void;
  emitProgress: (progress: Progress) => void;
  hasProgress: () => boolean;
  waitForFirstProgressOrResponse: (
    responsePromise: Promise<TransformResponse>
  ) => Promise<FirstTransformOutcome>;
}

export type FirstTransformOutcome =
  | { type: 'progress' }
  | { type: 'response'; response: TransformResponse };

type NdjsonWritableEvent = StreamProgressEvent | StreamResultEvent;

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

function encodeNdjsonEvent(
  encoder: TextEncoder,
  event: NdjsonWritableEvent
): Uint8Array {
  return encoder.encode(JSON.stringify(event) + '\n');
}

function createNdjsonStreamWriter(
  request: Request,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): NdjsonStreamWriter {
  let closed = false;

  const close = (): void => {
    if (closed) {
      return;
    }

    closed = true;
    request.signal.removeEventListener('abort', close);
    try {
      controller.close();
    } catch {
      // Ignore errors if stream is already closed by client abort.
    }
  };

  request.signal.addEventListener('abort', close, { once: true });

  function write(event: NdjsonWritableEvent): void {
    if (closed) {
      return;
    }

    try {
      controller.enqueue(encodeNdjsonEvent(encoder, event));
    } catch {
      // Ignore errors if client aborted the stream.
    }
  }

  return {
    close,
    writeProgress(event) {
      write(event);
    },
    writeResult(response) {
      write(createStreamResultEvent(response));
    },
  };
}

function createNdjsonResponseStream(
  request: Request,
  responsePromise: Promise<TransformResponse>,
  onStart: (writer: NdjsonStreamWriter) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller: ReadableStreamDefaultController<Uint8Array>) {
      const streamWriter = createNdjsonStreamWriter(
        request,
        controller,
        encoder
      );
      onStart(streamWriter);

      try {
        if (request.signal.aborted) {
          return;
        }

        const response = await responsePromise;
        if (!request.signal.aborted) {
          streamWriter.writeResult(response);
        }
      } finally {
        streamWriter.close();
      }
    },
    cancel() {
      // The runtime calls this when the client disconnects.
    },
  });
}

export function createBufferedProgressEmitter(): BufferedProgressEmitter {
  const bufferedEvents: StreamProgressEvent[] = [];
  const { promise: firstProgressPromise, resolve: resolveFirstProgress } =
    Promise.withResolvers<void>();
  let sawProgress = false;
  let writer: NdjsonStreamWriter | null = null;

  function markProgressSeen(): void {
    if (!sawProgress) {
      sawProgress = true;
      resolveFirstProgress();
    }
  }

  return {
    attachWriter(nextWriter) {
      writer = nextWriter;

      for (const event of bufferedEvents) {
        nextWriter.writeProgress(event);
      }

      bufferedEvents.length = 0;
    },
    emitProgress(progress) {
      markProgressSeen();
      const event = createStreamProgressEvent(
        progress.progress,
        progress.total,
        progress.message
      );

      if (writer) {
        writer.writeProgress(event);
        return;
      }

      bufferedEvents.push(event);
    },
    hasProgress() {
      return sawProgress;
    },
    waitForFirstProgressOrResponse(responsePromise) {
      return Promise.race([
        responsePromise.then(
          (response) => ({ type: 'response', response }) as const
        ),
        firstProgressPromise.then(() => ({ type: 'progress' }) as const),
      ]);
    },
  };
}

export function createNdjsonResponse(
  request: Request,
  responsePromise: Promise<TransformResponse>,
  onStart: (writer: NdjsonStreamWriter) => void,
  headers: HeadersInit
): Response {
  return new Response(
    createNdjsonResponseStream(request, responsePromise, onStart),
    { headers }
  );
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
