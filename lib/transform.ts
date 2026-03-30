import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

import type {
  TransformError,
  TransformErrorResponse,
  TransformResponse,
} from '@/lib/api';
import {
  createInternalError,
  createTransformError,
  isAbortError,
  isTimeoutError,
} from '@/lib/api';
import { callFetchUrl, parseMcpResult, type ProgressCallback } from '@/lib/mcp';
import type { TransformRequest } from '@/lib/validate';

const RETRYABLE_TRANSPORT_ERROR_CODES = new Set<number>([
  ErrorCode.RequestTimeout,
  ErrorCode.ConnectionClosed,
]);
const MAX_TRANSFORM_ATTEMPTS = 2;
const ABORT_REASON_BY_ERROR_NAME = {
  aborted: 'aborted',
  timeout: 'timeout',
} as const;

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

function createAbortedTransformError(
  message: string,
  reason: (typeof ABORT_REASON_BY_ERROR_NAME)[keyof typeof ABORT_REASON_BY_ERROR_NAME]
): TransformError {
  return createTransformError('ABORTED', message, {
    retryable: true,
    details: { reason },
  });
}

function mapTransportError(error: unknown): TransformError {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (isTimeoutError(error)) {
    return createAbortedTransformError(
      message,
      ABORT_REASON_BY_ERROR_NAME.timeout
    );
  }

  if (isAbortError(error)) {
    return createAbortedTransformError(
      message,
      ABORT_REASON_BY_ERROR_NAME.aborted
    );
  }

  if (error instanceof McpError) {
    return createInternalError(
      message,
      RETRYABLE_TRANSPORT_ERROR_CODES.has(error.code)
    );
  }

  return createInternalError(message, false);
}
