import type { Progress } from '@modelcontextprotocol/sdk/types.js';

import {
  createStreamProgressEvent,
  createTransformError,
  NDJSON_CONTENT_TYPE,
  type StreamEvent,
  type TransformError,
  type TransformErrorCode,
  type TransformErrorResponse,
  type TransformResponse,
} from '@/lib/api';
import { transformUrl } from '@/lib/transform';
import {
  type TransformRequest,
  validateTransformRequest,
  ValidationError,
} from '@/lib/validate';

export const runtime = 'nodejs';

const HTTP_STATUS_BY_ERROR_CODE: Record<TransformErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FETCH_ERROR: 502,
  HTTP_ERROR: 502,
  ABORTED: 504,
  QUEUE_FULL: 503,
  INTERNAL_ERROR: 500,
};

const NDJSON_HEADERS = {
  'Content-Type': NDJSON_CONTENT_TYPE,
  'Cache-Control': 'no-cache',
} as const;

const MAX_REQUEST_BODY_SIZE = 4096;

interface StreamGuard {
  close: () => void;
  write: (event: StreamEvent) => void;
}

interface BufferedProgressEmitter {
  attachWriter: (writer: StreamGuard) => void;
  emitProgress: (progress: Progress) => void;
  hasProgress: () => boolean;
  waitForFirstProgressOrResponse: (
    responsePromise: Promise<TransformResponse>
  ) => Promise<FirstTransformOutcome>;
}

type FirstTransformOutcome =
  | { type: 'progress' }
  | { type: 'response'; response: TransformResponse };

function readValidationErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : 'Invalid request.';
}

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Invalid JSON body.');
  }
}

async function parseTransformRequest(
  request: Request
): Promise<TransformRequest> {
  return validateTransformRequest(await readRequestBody(request));
}

function isOversizedRequest(request: Request): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength === null) {
    return false;
  }

  const size = Number.parseInt(contentLength, 10);
  return !Number.isNaN(size) && size > MAX_REQUEST_BODY_SIZE;
}

function createValidationErrorResponse(message: string): Response {
  return createErrorResponse(
    createTransformError('VALIDATION_ERROR', message, { retryable: false })
  );
}

function createErrorResponse(error: TransformError): Response {
  return Response.json(
    { ok: false, error },
    { status: HTTP_STATUS_BY_ERROR_CODE[error.code] }
  );
}

function encodeNdjsonEvent(
  encoder: TextEncoder,
  event: StreamEvent
): Uint8Array {
  return encoder.encode(JSON.stringify(event) + '\n');
}

function createStreamGuard(
  request: Request,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): StreamGuard {
  let closed = false;

  const close = () => {
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

  return {
    close,
    write(event: StreamEvent) {
      if (closed) {
        return;
      }

      try {
        controller.enqueue(encodeNdjsonEvent(encoder, event));
      } catch {
        // Ignore errors if client aborted the stream
      }
    },
  };
}

function createNdjsonResponseStream(
  request: Request,
  responsePromise: Promise<TransformResponse>,
  onStart: (streamGuard: StreamGuard) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller: ReadableStreamDefaultController<Uint8Array>) {
      const streamGuard = createStreamGuard(request, controller, encoder);
      onStart(streamGuard);

      try {
        if (request.signal.aborted) {
          return;
        }

        const response = await responsePromise;

        if (!request.signal.aborted) {
          writeResultEvent(streamGuard, response);
        }
      } finally {
        streamGuard.close();
      }
    },
  });
}

function writeResultEvent(
  streamGuard: StreamGuard,
  response: TransformResponse
): void {
  streamGuard.write({ type: 'result', ...response });
}

function createBufferedProgressEmitter(): BufferedProgressEmitter {
  const bufferedEvents: StreamEvent[] = [];
  const { promise: firstProgressPromise, resolve: resolveFirstProgress } =
    Promise.withResolvers<void>();
  let sawProgress = false;
  let writer: StreamGuard | null = null;

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
        nextWriter.write(event);
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
        writer.write(event);
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

function shouldReturnImmediateErrorResponse(
  firstOutcome: FirstTransformOutcome,
  progressEmitter: BufferedProgressEmitter
): firstOutcome is {
  type: 'response';
  response: TransformErrorResponse;
} {
  return (
    firstOutcome.type === 'response' &&
    !progressEmitter.hasProgress() &&
    !firstOutcome.response.ok
  );
}

export async function POST(request: Request): Promise<Response> {
  if (isOversizedRequest(request)) {
    return createValidationErrorResponse('Request body too large.');
  }

  try {
    const validated = await parseTransformRequest(request);
    const progressEmitter = createBufferedProgressEmitter();

    const responsePromise = transformUrl(
      validated,
      progressEmitter.emitProgress,
      request.signal
    );

    const firstOutcome =
      await progressEmitter.waitForFirstProgressOrResponse(responsePromise);
    if (shouldReturnImmediateErrorResponse(firstOutcome, progressEmitter)) {
      return createErrorResponse(firstOutcome.response.error);
    }

    const stream = createNdjsonResponseStream(
      request,
      responsePromise,
      progressEmitter.attachWriter
    );

    return new Response(stream, { headers: NDJSON_HEADERS });
  } catch (error) {
    return createValidationErrorResponse(readValidationErrorMessage(error));
  }
}
