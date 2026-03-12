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

function writeNdjsonEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
): void {
  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
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
      const abortHandler = createAbortHandler(request, controller);
      const writeLine = (event: StreamEvent) => {
        if (abortHandler.isClosed()) {
          return;
        }

        writeNdjsonEvent(controller, encoder, event);
      };

      request.signal.addEventListener("abort", abortHandler.closeStream, {
        once: true,
      });

      try {
        if (request.signal.aborted) {
          return;
        }

        const response = await handleTransform((progress) => {
          writeLine(
            createStreamProgressEvent(
              progress.progress,
              progress.total,
              progress.message,
            ),
          );
        });

        if (!request.signal.aborted) {
          writeLine({ type: "result", ...response });
        }
      } finally {
        abortHandler.closeStream();
      }
    },
  });
}

export async function POST(request: Request) {
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
