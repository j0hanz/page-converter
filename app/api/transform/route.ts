import {
  validateTransformRequest,
  ValidationError,
  type TransformRequest,
} from "@/lib/validate";
import { transformUrl } from "@/lib/transform";
import {
  createStreamProgressEvent,
  createTransformError,
  NDJSON_CONTENT_TYPE,
  type StreamEvent,
  type TransformResponse,
  type TransformError,
  type TransformErrorCode,
  type TransformErrorResponse,
} from "@/lib/api";
import type { Progress } from "@modelcontextprotocol/sdk/types.js";

export const runtime = "nodejs";

const HTTP_STATUS_BY_ERROR_CODE: Record<TransformErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FETCH_ERROR: 502,
  HTTP_ERROR: 502,
  ABORTED: 504,
  QUEUE_FULL: 503,
  INTERNAL_ERROR: 500,
};

const NDJSON_HEADERS = {
  "Content-Type": NDJSON_CONTENT_TYPE,
  "Cache-Control": "no-cache",
} as const;

const MAX_REQUEST_BODY_SIZE = 4096;
const INVALID_REQUEST_MESSAGE = "Invalid request.";
const INVALID_JSON_BODY_MESSAGE = "Invalid JSON body.";
const REQUEST_BODY_TOO_LARGE_MESSAGE = "Request body too large.";

interface StreamGuard {
  close: () => void;
  write: (event: StreamEvent) => void;
}

interface ProgressBridge {
  attachStreamGuard: (streamGuard: StreamGuard) => void;
  handleProgress: (progress: Progress) => void;
  hasProgress: () => boolean;
  readFirstOutcome: (
    responsePromise: Promise<TransformResponse>,
  ) => Promise<FirstTransformOutcome>;
}

type FirstTransformOutcome =
  | { type: "progress" }
  | { type: "response"; response: TransformResponse };

function readValidationErrorMessage(error: unknown): string {
  return error instanceof ValidationError
    ? error.message
    : INVALID_REQUEST_MESSAGE;
}

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError(INVALID_JSON_BODY_MESSAGE);
  }
}

function validateRequestBody(body: unknown): TransformRequest {
  try {
    return validateTransformRequest(body);
  } catch (error) {
    throw new ValidationError(readValidationErrorMessage(error));
  }
}

async function parseTransformRequest(
  request: Request,
): Promise<TransformRequest> {
  return validateRequestBody(await readRequestBody(request));
}

function isOversizedRequest(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    return false;
  }

  const size = Number.parseInt(contentLength, 10);
  return !Number.isNaN(size) && size > MAX_REQUEST_BODY_SIZE;
}

function createValidationErrorResponse(message: string): Response {
  return createErrorResponse(
    createTransformError("VALIDATION_ERROR", message, { retryable: false }),
  );
}

function createErrorResponse(error: TransformError): Response {
  return Response.json(
    { ok: false, error },
    { status: HTTP_STATUS_BY_ERROR_CODE[error.code] },
  );
}

function encodeNdjsonEvent(
  encoder: TextEncoder,
  event: StreamEvent,
): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

function createStreamGuard(
  request: Request,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): StreamGuard {
  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    request.signal.removeEventListener("abort", close);
    try {
      controller.close();
    } catch {
      // Ignore errors if stream is already closed by client abort
    }
  };

  request.signal.addEventListener("abort", close, { once: true });

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
  onStart: (streamGuard: StreamGuard) => void,
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

function writeProgressEvent(
  streamGuard: StreamGuard,
  progress: Progress,
): void {
  streamGuard.write(
    createStreamProgressEvent(
      progress.progress,
      progress.total,
      progress.message,
    ),
  );
}

function writeResultEvent(
  streamGuard: StreamGuard,
  response: TransformResponse,
): void {
  streamGuard.write({ type: "result", ...response });
}

function createFirstProgressPromise(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  return Promise.withResolvers<void>();
}

async function readFirstTransformOutcome(
  responsePromise: Promise<TransformResponse>,
  firstProgressPromise: Promise<void>,
): Promise<FirstTransformOutcome> {
  return Promise.race([
    responsePromise.then(
      (response) => ({ type: "response", response }) as const,
    ),
    firstProgressPromise.then(() => ({ type: "progress" }) as const),
  ]);
}

function createProgressBridge(): ProgressBridge {
  const bufferedProgress: Progress[] = [];
  const { promise: firstProgressPromise, resolve: resolveFirstProgress } =
    createFirstProgressPromise();
  let sawProgress = false;
  let liveStreamGuard: StreamGuard | null = null;

  function markProgressSeen(): void {
    if (!sawProgress) {
      sawProgress = true;
      resolveFirstProgress();
    }
  }

  return {
    attachStreamGuard(streamGuard) {
      liveStreamGuard = streamGuard;

      for (const progress of bufferedProgress) {
        writeProgressEvent(streamGuard, progress);
      }

      bufferedProgress.length = 0;
    },
    handleProgress(progress) {
      markProgressSeen();

      if (liveStreamGuard) {
        writeProgressEvent(liveStreamGuard, progress);
        return;
      }

      bufferedProgress.push(progress);
    },
    hasProgress() {
      return sawProgress;
    },
    readFirstOutcome(responsePromise) {
      return readFirstTransformOutcome(responsePromise, firstProgressPromise);
    },
  };
}

function shouldReturnImmediateErrorResponse(
  firstOutcome: FirstTransformOutcome,
  progressBridge: ProgressBridge,
): firstOutcome is {
  type: "response";
  response: TransformErrorResponse;
} {
  return (
    firstOutcome.type === "response" &&
    !progressBridge.hasProgress() &&
    !firstOutcome.response.ok
  );
}

export async function POST(request: Request): Promise<Response> {
  if (isOversizedRequest(request)) {
    return createValidationErrorResponse(REQUEST_BODY_TOO_LARGE_MESSAGE);
  }

  try {
    const validated = await parseTransformRequest(request);
    const progressBridge = createProgressBridge();

    const responsePromise = transformUrl(
      validated,
      progressBridge.handleProgress,
      request.signal,
    );

    const firstOutcome = await progressBridge.readFirstOutcome(responsePromise);
    if (shouldReturnImmediateErrorResponse(firstOutcome, progressBridge)) {
      return createErrorResponse(firstOutcome.response.error);
    }

    const stream = createNdjsonResponseStream(
      request,
      responsePromise,
      progressBridge.attachStreamGuard,
    );

    return new Response(stream, { headers: NDJSON_HEADERS });
  } catch (error) {
    return createValidationErrorResponse(readValidationErrorMessage(error));
  }
}
