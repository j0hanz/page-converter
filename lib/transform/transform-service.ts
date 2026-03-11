import type { TransformRequest } from "@/lib/validation/transform-request";
import type {
  TransformResponse,
  TransformError,
  TransformErrorCode,
} from "@/lib/errors/transform-errors";
import { createInternalError } from "@/lib/errors/transform-errors";
import { callFetchUrl } from "@/lib/mcp/mcp-client";
import { parseMcpResult } from "@/lib/mcp/runtime";

const RETRYABLE_CODES = new Set<TransformErrorCode>([
  "FETCH_ERROR",
  "QUEUE_FULL",
]);

function isRetryableError(error: TransformError): boolean {
  return (
    RETRYABLE_CODES.has(error.code) ||
    (error.code === "HTTP_ERROR" &&
      error.statusCode !== undefined &&
      error.statusCode >= 500)
  );
}

async function executeTransform(
  request: TransformRequest,
): Promise<TransformResponse> {
  try {
    const raw = await callFetchUrl({
      url: request.url,
      skipNoiseRemoval: request.skipNoiseRemoval,
      forceRefresh: request.forceRefresh,
      maxInlineChars: request.maxInlineChars,
    });
    return parseMcpResult(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: createInternalError(message),
    };
  }
}

export async function transformUrl(
  request: TransformRequest,
): Promise<TransformResponse> {
  const first = await executeTransform(request);

  // Retry once for retryable errors
  if (!first.ok && isRetryableError(first.error)) {
    return executeTransform(request);
  }

  return first;
}
