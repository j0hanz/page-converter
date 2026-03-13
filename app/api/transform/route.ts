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
} from "@/lib/api";
import type { Progress } from "@modelcontextprotocol/sdk/types.js";

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

interface StreamGuard {
  close: () => void;
  isClosed: () => boolean;
  write: (event: StreamEvent) => void;
}

function readValidationErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : "Invalid request.";
}

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body.");
  }
}

function validateRequestBody(body: unknown): TransformRequest {
  try {
    return validateTransformRequest(body);
  } catch (error) {
    throw new ValidationError(readValidationErrorMessage(error));
  }
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

function createAbortHandler(
  request: Request,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  let closed = false;

  const closeStream = () => {
    if (closed) {
      return;
    }

    closed = true;
    request.signal.removeEventListener("abort", closeStream);
    controller.close();
  };

  return {
    closeStream,
    isClosed: () => closed,
  };
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
  const abortHandler = createAbortHandler(request, controller);

  request.signal.addEventListener("abort", abortHandler.closeStream, {
    once: true,
  });

  return {
    close: abortHandler.closeStream,
    isClosed: abortHandler.isClosed,
    write(event: StreamEvent) {
      if (abortHandler.isClosed()) {
        return;
      }

      controller.enqueue(encodeNdjsonEvent(encoder, event));
    },
  };
}

function createNdjsonResponseStream(
  request: Request,
  handleTransform: (
    onProgress: (progress: Progress) => void,
  ) => Promise<TransformResponse>,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller: ReadableStreamDefaultController<Uint8Array>) {
      const streamGuard = createStreamGuard(request, controller, encoder);

      try {
        if (request.signal.aborted) {
          return;
        }

        const response = await handleTransform((progress) => {
          streamGuard.write(
            createStreamProgressEvent(
              progress.progress,
              progress.total,
              progress.message,
            ),
          );
        });

        if (!request.signal.aborted) {
          streamGuard.write({ type: "result", ...response });
        }
      } finally {
        streamGuard.close();
      }
    },
  });
}

export async function POST(request: Request) {
  if (isOversizedRequest(request)) {
    return createValidationErrorResponse("Request body too large.");
  }

  try {
    const body = await readRequestBody(request);
    const validated = validateRequestBody(body);

    const stream = createNdjsonResponseStream(request, (onProgress) =>
      transformUrl(validated, onProgress),
    );

    return new Response(stream, { headers: NDJSON_HEADERS });
  } catch (error) {
    return createValidationErrorResponse(readValidationErrorMessage(error));
  }
}
