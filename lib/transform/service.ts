import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { TransformRequest } from "@/lib/validation/request";
import type {
  TransformResponse,
  TransformError,
  TransformErrorResponse,
} from "@/lib/errors/transform";
import { createInternalError } from "@/lib/errors/transform";
import { callFetchUrl, type ProgressCallback } from "@/lib/mcp/client";
import { parseMcpResult } from "@/lib/mcp/result";

const RETRYABLE_TRANSPORT_ERROR_CODES = new Set<ErrorCode>([
  ErrorCode.RequestTimeout,
  ErrorCode.ConnectionClosed,
]);

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
  const firstAttempt = await executeTransform(request, onProgress);

  if (shouldRetry(firstAttempt)) {
    return executeTransform(request, onProgress);
  }

  return firstAttempt;
}

function shouldRetry(
  response: TransformResponse,
): response is TransformErrorResponse {
  return !response.ok && response.error.retryable;
}

function mapTransportError(error: unknown): TransformError {
  if (error instanceof McpError) {
    const errorCode = error.code as ErrorCode;

    if (RETRYABLE_TRANSPORT_ERROR_CODES.has(errorCode)) {
      return createInternalError(error.message, true);
    }

    return createInternalError(error.message);
  }

  if (error instanceof Error) {
    return createInternalError(error.message);
  }

  return createInternalError("Unknown error");
}
