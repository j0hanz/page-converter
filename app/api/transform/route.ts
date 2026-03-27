import { after } from 'next/server';

import type { Progress } from '@modelcontextprotocol/sdk/types.js';

import {
  createStreamProgressEvent,
  createStreamResultEvent,
  createTransformError,
  NDJSON_CONTENT_TYPE,
  type StreamProgressEvent,
  type StreamResultEvent,
  type TransformError,
  type TransformErrorResponse,
  type TransformResponse,
} from '@/lib/api';
import {
  createTransformLog,
  createValidationLog,
  logTransformOutcome,
} from '@/lib/request-logger';
import { transformUrl } from '@/lib/transform';
import {
  type TransformRequest,
  validateTransformRequest,
  ValidationError,
} from '@/lib/validate';

const NDJSON_HEADERS = {
  'Content-Type': NDJSON_CONTENT_TYPE,
  'Cache-Control': 'no-cache',
} as const;

const MAX_REQUEST_BODY_SIZE = 4096;
const INVALID_JSON_BODY_MESSAGE = 'Invalid JSON body.';

interface NdjsonStreamWriter {
  close: () => void;
  writeProgress: (event: StreamProgressEvent) => void;
  writeResult: (response: TransformResponse) => void;
}

interface BufferedProgressEmitter {
  attachWriter: (writer: NdjsonStreamWriter) => void;
  emitProgress: (progress: Progress) => void;
  hasProgress: () => boolean;
  waitForFirstProgressOrResponse: (
    responsePromise: Promise<TransformResponse>
  ) => Promise<FirstTransformOutcome>;
}

type FirstTransformOutcome =
  | { type: 'progress' }
  | { type: 'response'; response: TransformResponse };
type NdjsonWritableEvent = StreamProgressEvent | StreamResultEvent;

function readValidationErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : 'Invalid request.';
}

async function readRequestBody(request: Request): Promise<unknown> {
  const text = await request.text().catch(() => {
    throw new ValidationError(INVALID_JSON_BODY_MESSAGE);
  });

  if (text.length > MAX_REQUEST_BODY_SIZE) {
    throw new ValidationError('Request body too large.');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError(INVALID_JSON_BODY_MESSAGE);
  }
}

async function parseTransformRequest(
  request: Request
): Promise<TransformRequest> {
  return validateTransformRequest(await readRequestBody(request));
}

function createValidationErrorResponse(message: string): Response {
  return createErrorResponse(
    createTransformError('VALIDATION_ERROR', message, { retryable: false })
  );
}

function createErrorResponse(error: TransformError): Response {
  return Response.json(
    { ok: false, error },
    { status: error.statusCode ?? 500 }
  );
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
      // Ignore errors if stream is already closed by client abort
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
      // Ignore errors if client aborted the stream
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
      // Called by the runtime when the client disconnects.
      // streamWriter.close() is idempotent via the closed flag.
    },
  });
}

function createBufferedProgressEmitter(): BufferedProgressEmitter {
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
      const event = createProgressEvent(progress);

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

function createProgressEvent(progress: Progress): StreamProgressEvent {
  return createStreamProgressEvent(
    progress.progress,
    progress.total,
    progress.message
  );
}

function shouldReturnImmediateErrorResponse(
  initialOutcome: FirstTransformOutcome,
  progressEmitter: BufferedProgressEmitter
): initialOutcome is {
  type: 'response';
  response: TransformErrorResponse;
} {
  return (
    initialOutcome.type === 'response' &&
    !progressEmitter.hasProgress() &&
    !initialOutcome.response.ok
  );
}

function createStreamingTransformResponse(
  request: Request,
  responsePromise: Promise<TransformResponse>,
  progressEmitter: BufferedProgressEmitter
): Response {
  const stream = createNdjsonResponseStream(
    request,
    responsePromise,
    progressEmitter.attachWriter
  );

  return new Response(stream, { headers: NDJSON_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    const validated = await parseTransformRequest(request);
    const progressEmitter = createBufferedProgressEmitter();

    const responsePromise = transformUrl(
      validated,
      progressEmitter.emitProgress,
      request.signal
    );

    const initialOutcome =
      await progressEmitter.waitForFirstProgressOrResponse(responsePromise);
    if (shouldReturnImmediateErrorResponse(initialOutcome, progressEmitter)) {
      after(() =>
        logTransformOutcome(
          createTransformLog(
            request,
            validated.url,
            startTime,
            initialOutcome.response
          )
        )
      );
      return createErrorResponse(initialOutcome.response.error);
    }

    after(async () => {
      const response = await responsePromise;
      logTransformOutcome(
        createTransformLog(request, validated.url, startTime, response)
      );
    });

    return createStreamingTransformResponse(
      request,
      responsePromise,
      progressEmitter
    );
  } catch (error) {
    after(() => logTransformOutcome(createValidationLog(request, startTime)));
    return createValidationErrorResponse(readValidationErrorMessage(error));
  }
}
