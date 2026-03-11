import {
  validateTransformRequest,
  ValidationError,
} from "@/lib/validation/request";
import { transformUrl } from "@/lib/transform/service";
import {
  createTransformError,
  NDJSON_CONTENT_TYPE,
  type StreamEvent,
  type TransformError,
  type TransformErrorCode,
} from "@/lib/errors/transform";
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
  "Transfer-Encoding": "chunked",
} as const;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createValidationErrorResponse("Invalid JSON body.");
  }

  let validated;
  try {
    validated = validateTransformRequest(body);
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : "Invalid request.";
    return createValidationErrorResponse(message);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function writeLine(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      function onProgress(p: Progress) {
        writeLine({
          type: "progress",
          progress: p.progress,
          total: p.total ?? 0,
          message: p.message ?? "",
        });
      }

      try {
        const response = await transformUrl(validated, onProgress);
        writeLine({ type: "result", ...response });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
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
