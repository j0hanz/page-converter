import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

import type {
  TransformError,
  TransformErrorResponse,
  TransformResponse,
} from '@/lib/api';
import { createInternalError, createTransformError } from '@/lib/api';
import { callFetchUrl, parseMcpResult, type ProgressCallback } from '@/lib/mcp';
import type { TransformRequest } from '@/lib/validate';

const RETRYABLE_TRANSPORT_ERROR_CODES = new Set<number>([
  ErrorCode.RequestTimeout,
  ErrorCode.ConnectionClosed,
]);
const MAX_TRANSFORM_ATTEMPTS = 2;

interface TransportErrorPolicy {
  details?: TransformError['details'];
  message: string;
  retryable: boolean;
}

async function executeTransform(
  request: TransformRequest,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<TransformResponse> {
  try {
    const raw = await callFetchUrl(
      { url: request.url },
      { onProgress, signal }
    );
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
  signal?: AbortSignal
): Promise<TransformResponse> {
  for (let attempt = 1; attempt <= MAX_TRANSFORM_ATTEMPTS; attempt += 1) {
    const response = await executeTransform(request, onProgress, signal);

    if (!shouldRetryResponse(response, attempt, signal)) {
      return response;
    }
  }

  return {
    ok: false,
    error: createInternalError('Transform failed to execute.'),
  };
}

function isRetryableErrorResponse(
  response: TransformResponse
): response is TransformErrorResponse {
  return !response.ok && response.error.retryable;
}

function shouldRetryResponse(
  response: TransformResponse,
  attempt: number,
  signal?: AbortSignal
): boolean {
  if (signal?.aborted) return false;
  return isRetryableErrorResponse(response) && attempt < MAX_TRANSFORM_ATTEMPTS;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isAbortLikeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isTimeoutLikeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

function readTransportErrorPolicy(error: unknown): TransportErrorPolicy {
  if (isTimeoutLikeError(error)) {
    return {
      message: readErrorMessage(error),
      retryable: true,
      details: { reason: 'timeout' },
    };
  }

  if (isAbortLikeError(error)) {
    return {
      message: readErrorMessage(error),
      retryable: true,
      details: { reason: 'aborted' },
    };
  }

  if (error instanceof McpError) {
    return {
      message: error.message,
      retryable: RETRYABLE_TRANSPORT_ERROR_CODES.has(error.code),
    };
  }

  return {
    message: readErrorMessage(error),
    retryable: false,
  };
}

function mapTransportError(error: unknown): TransformError {
  const policy = readTransportErrorPolicy(error);

  if (policy.details) {
    return createTransformError('ABORTED', policy.message, {
      retryable: policy.retryable,
      details: policy.details,
    });
  }

  return createInternalError(policy.message, policy.retryable);
}
