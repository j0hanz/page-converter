import { after } from 'next/server';

import {
  createTransformError,
  type TransformError,
  type TransformErrorResponse,
  type TransformResponse,
} from '@/lib/api';
import {
  createTransformLog,
  createValidationLog,
  logTransformOutcome,
} from '@/lib/request-logger';
import {
  type BufferedProgressEmitter,
  createBufferedProgressEmitter,
  createNdjsonResponse,
  type FirstTransformOutcome,
  NDJSON_CONTENT_TYPE,
} from '@/lib/stream';
import { transformUrl } from '@/lib/transform';
import {
  type TransformRequest,
  validateTransformRequest,
  ValidationError,
} from '@/lib/validate';

const NDJSON_HEADERS = {
  'Content-Type': NDJSON_CONTENT_TYPE,
  'Cache-Control': 'no-cache',
} as const;

const MAX_REQUEST_BODY_SIZE = 4096;
const INVALID_JSON_BODY_MESSAGE = 'Invalid JSON body.';

function readValidationErrorMessage(error: unknown): string {
  return error instanceof ValidationError ? error.message : 'Invalid request.';
}

async function readRequestBody(request: Request): Promise<unknown> {
  const text = await request.text().catch(() => {
    throw new ValidationError(INVALID_JSON_BODY_MESSAGE);
  });

  if (text.length > MAX_REQUEST_BODY_SIZE) {
    throw new ValidationError('Request body too large.');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError(INVALID_JSON_BODY_MESSAGE);
  }
}

async function parseTransformRequest(
  request: Request
): Promise<TransformRequest> {
  return validateTransformRequest(await readRequestBody(request));
}

function createValidationErrorResponse(message: string): Response {
  return createErrorResponse(
    createTransformError('VALIDATION_ERROR', message, { retryable: false })
  );
}

function createErrorResponse(error: TransformError): Response {
  return Response.json(
    { ok: false, error },
    { status: error.statusCode ?? 500 }
  );
}

function shouldReturnImmediateErrorResponse(
  initialOutcome: FirstTransformOutcome,
  progressEmitter: BufferedProgressEmitter
): initialOutcome is {
  type: 'response';
  response: TransformErrorResponse;
} {
  return (
    initialOutcome.type === 'response' &&
    !progressEmitter.hasProgress() &&
    !initialOutcome.response.ok
  );
}

function createStreamingTransformResponse(
  request: Request,
  responsePromise: Promise<TransformResponse>,
  progressEmitter: BufferedProgressEmitter
): Response {
  return createNdjsonResponse(
    request,
    responsePromise,
    progressEmitter.attachWriter,
    NDJSON_HEADERS
  );
}

function scheduleTransformLog(
  request: Request,
  url: string,
  startTime: number,
  responseOrPromise: TransformResponse | Promise<TransformResponse>
): void {
  after(async () => {
    const response = await responseOrPromise;
    logTransformOutcome(createTransformLog(request, url, startTime, response));
  });
}

function scheduleValidationLog(request: Request, startTime: number): void {
  after(() => logTransformOutcome(createValidationLog(request, startTime)));
}

export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    const validated = await parseTransformRequest(request);
    const progressEmitter = createBufferedProgressEmitter();

    const responsePromise = transformUrl(
      validated,
      progressEmitter.emitProgress,
      request.signal
    );

    const initialOutcome =
      await progressEmitter.waitForFirstProgressOrResponse(responsePromise);
    if (shouldReturnImmediateErrorResponse(initialOutcome, progressEmitter)) {
      scheduleTransformLog(
        request,
        validated.url,
        startTime,
        initialOutcome.response
      );
      return createErrorResponse(initialOutcome.response.error);
    }

    scheduleTransformLog(request, validated.url, startTime, responsePromise);

    return createStreamingTransformResponse(
      request,
      responsePromise,
      progressEmitter
    );
  } catch (error) {
    scheduleValidationLog(request, startTime);
    return createValidationErrorResponse(readValidationErrorMessage(error));
  }
}
