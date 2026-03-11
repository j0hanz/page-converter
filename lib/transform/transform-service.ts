import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { TransformRequest } from "@/lib/validation/transform-request";
import type {
  TransformResponse,
  TransformError,
} from "@/lib/errors/transform-errors";
import { createInternalError } from "@/lib/errors/transform-errors";
import { callFetchUrl } from "@/lib/mcp/mcp-client";
import { parseMcpResult } from "@/lib/mcp/runtime";

function isRetryableError(error: TransformError): boolean {
  return error.retryable;
}

async function executeTransform(
  request: TransformRequest,
): Promise<TransformResponse> {
  try {
    const raw = await callFetchUrl(buildFetchUrlArgs(request));
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
): Promise<TransformResponse> {
  const first = await executeTransform(request);

  // Retry once for retryable errors
  if (!first.ok && isRetryableError(first.error)) {
    return executeTransform(request);
  }

  return first;
}

function buildFetchUrlArgs(request: TransformRequest) {
  return {
    url: request.url,
    skipNoiseRemoval: request.skipNoiseRemoval,
    forceRefresh: request.forceRefresh,
    maxInlineChars: request.maxInlineChars,
  };
}

function mapTransportError(error: unknown): TransformError {
  if (error instanceof McpError) {
    const errorCode = error.code as ErrorCode;

    if (
      errorCode === ErrorCode.RequestTimeout ||
      errorCode === ErrorCode.ConnectionClosed
    ) {
      return createInternalError(error.message, true);
    }

    return createInternalError(error.message);
  }

  if (error instanceof Error) {
    return createInternalError(error.message);
  }

  return createInternalError("Unknown error");
}
