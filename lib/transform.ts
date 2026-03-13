import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { TransformRequest } from "@/lib/validate";
import type {
  TransformResponse,
  TransformError,
  TransformErrorResponse,
} from "@/lib/api";
import { createInternalError } from "@/lib/api";
import { callFetchUrl, type ProgressCallback, parseMcpResult } from "@/lib/mcp";

const RETRYABLE_TRANSPORT_ERROR_CODES = new Set<ErrorCode>([
  ErrorCode.RequestTimeout,
  ErrorCode.ConnectionClosed,
]);
const MAX_TRANSFORM_ATTEMPTS = 2;
const FALLBACK_INTERNAL_ERROR_MESSAGE = "Transform failed to execute.";

async function executeTransform(
  request: TransformRequest,
  onProgress?: ProgressCallback,
): Promise<TransformResponse> {
  try {
    const raw = await callFetchUrl({ url: request.url }, onProgress);
    return parseMcpResult(raw);
  } catch (error) {
    return {
      ok: false,
      error: mapTransportError(error),
    };
  }
}

export async function transformUrl(
  request: TransformRequest,
  onProgress?: ProgressCallback,
): Promise<TransformResponse> {
  for (let attempt = 1; attempt <= MAX_TRANSFORM_ATTEMPTS; attempt += 1) {
    const response = await executeTransform(request, onProgress);

    if (!shouldRetryResponse(response, attempt)) {
      return response;
    }
  }

  return createInternalErrorResponse(FALLBACK_INTERNAL_ERROR_MESSAGE);
}

function isRetryableErrorResponse(
  response: TransformResponse,
): response is TransformErrorResponse {
  return !response.ok && response.error.retryable;
}

function shouldRetryResponse(
  response: TransformResponse,
  attempt: number,
): boolean {
  return isRetryableErrorResponse(response) && attempt < MAX_TRANSFORM_ATTEMPTS;
}

function createInternalErrorResponse(message: string): TransformErrorResponse {
  return {
    ok: false,
    error: createInternalError(message),
  };
}

function isRetryableTransportError(code: ErrorCode): boolean {
  return RETRYABLE_TRANSPORT_ERROR_CODES.has(code);
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function mapTransportError(error: unknown): TransformError {
  if (error instanceof McpError) {
    return createInternalError(
      error.message,
      isRetryableTransportError(error.code as ErrorCode),
    );
  }

  return createInternalError(readErrorMessage(error));
}
