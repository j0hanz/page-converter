import {
  validateTransformRequest,
  ValidationError,
} from "@/lib/validation/request";
import { transformUrl } from "@/lib/transform/service";
import {
  createTransformError,
  type TransformError,
  type TransformErrorCode,
  type TransformResult,
} from "@/lib/errors/transform";

const HTTP_STATUS_BY_ERROR_CODE: Record<TransformErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FETCH_ERROR: 502,
  HTTP_ERROR: 502,
  ABORTED: 504,
  QUEUE_FULL: 503,
  INTERNAL_ERROR: 500,
};
const SUCCESS_STATUS = 200;

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

  const response = await transformUrl(validated);

  if (response.ok) {
    return createSuccessResponse(response.result);
  }

  return createErrorResponse(response.error);
}

function createSuccessResponse(result: TransformResult): Response {
  return Response.json({ ok: true, result }, { status: SUCCESS_STATUS });
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
