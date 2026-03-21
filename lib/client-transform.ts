import type {
  StreamEvent,
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from '@/lib/api';
import {
  createNetworkError,
  createTimeoutError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
  isStreamEvent,
  isTransformError,
  isTransformErrorResponse,
  NDJSON_CONTENT_TYPE,
} from '@/lib/api';

interface ClientTransformHandlers {
  onError: (error: TransformError) => void;
  onProgress: (event: StreamProgressEvent) => void;
  onResult: (result: TransformResult) => void;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
const TRANSFORM_ENDPOINT = '/api/transform';

function isNdjsonResponse(response: Response): boolean {
  return (response.headers.get('Content-Type') ?? '').includes(
    NDJSON_CONTENT_TYPE
  );
}

function parseStreamEvent(line: string): StreamEvent {
  const parsed: unknown = JSON.parse(line);

  if (!isStreamEvent(parsed)) {
    throw new Error('Invalid stream event');
  }

  return parsed;
}

interface NdjsonStreamReader {
  consume: (chunk: string) => void;
  finalize: () => boolean;
}

function createNdjsonStreamReader(
  onEvent: (event: StreamEvent) => void
): NdjsonStreamReader {
  let buffer = '';
  let sawTerminalEvent = false;

  function emitLine(line: string): void {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      return;
    }

    sawTerminalEvent =
      emitParsedStreamEvent(trimmedLine, onEvent) || sawTerminalEvent;
  }

  return {
    consume(chunk) {
      const lines = (buffer + chunk).split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        emitLine(line);
      }
    },
    finalize() {
      emitLine(buffer);
      return sawTerminalEvent;
    },
  };
}

function emitParsedStreamEvent(
  line: string,
  onEvent: (event: StreamEvent) => void
): boolean {
  const event = parseStreamEvent(line);
  onEvent(event);
  return event.type !== 'progress';
}

function isNamedDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

async function readNdjsonStream(
  response: Response,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void
): Promise<TransformError | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    return createUnexpectedResponseError();
  }

  const decoder = new TextDecoder();
  const streamReader = createNdjsonStreamReader(onEvent);

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      streamReader.consume(decoder.decode(value, { stream: true }));
    }

    const sawTerminalEvent = streamReader.finalize();
    if (sawTerminalEvent || !signal.aborted) {
      return sawTerminalEvent ? null : createUnexpectedResponseError();
    }

    return isTimeoutError(signal.reason) ? createTimeoutError() : null;
  } catch (error) {
    if (isTimeoutError(error)) {
      return createTimeoutError();
    }

    if (isAbortError(error)) {
      return null;
    }

    return createUnexpectedResponseError();
  } finally {
    reader.releaseLock();
  }
}

function handleStreamEvent(
  event: StreamEvent,
  handlers: ClientTransformHandlers
): void {
  if (event.type === 'progress') {
    handlers.onProgress(event);
    return;
  }

  if (hasTransformResult(event)) {
    handlers.onResult(event.result);
    return;
  }

  if (hasTransformError(event)) {
    handlers.onError(event.error);
    return;
  }

  handlers.onError(createUnexpectedResponseError());
}

function handleJsonErrorResponse(
  data: unknown,
  onError: ClientTransformHandlers['onError']
): void {
  if (isTransformErrorResponse(data)) {
    onError(data.error);
    return;
  }

  onError(createUnexpectedResponseError());
}

async function handleTransformResponse(
  response: Response,
  signal: AbortSignal,
  handlers: ClientTransformHandlers
): Promise<void> {
  if (isNdjsonResponse(response)) {
    const streamError = await readNdjsonStream(
      response,
      signal,
      (streamEvent) => handleStreamEvent(streamEvent, handlers)
    );

    if (streamError) {
      handlers.onError(streamError);
    }

    return;
  }

  handleJsonErrorResponse(await response.json(), handlers.onError);
}

export async function submitTransformRequest(
  url: string,
  handlers: ClientTransformHandlers,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(TRANSFORM_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ url: url.trim() }),
    signal,
  });

  await handleTransformResponse(response, signal, handlers);
}

export function mapClientTransformError(error: unknown): TransformError {
  if (isTimeoutError(error)) {
    return createTimeoutError();
  }

  if (isTransformError(error)) {
    return error;
  }

  return createNetworkError();
}

export function isAbortError(error: unknown): boolean {
  return isNamedDomException(error, 'AbortError');
}

function isTimeoutError(error: unknown): boolean {
  return isNamedDomException(error, 'TimeoutError');
}
