import type { TransformRequest } from "@/lib/validate";
import type {
  StreamEvent,
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from "@/lib/api";
import {
  NDJSON_CONTENT_TYPE,
  createNetworkError,
  createTimeoutError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
  isStreamEvent,
  isTransformError,
  isTransformErrorResponse,
} from "@/lib/api";

interface ClientTransformHandlers {
  onError: (error: TransformError) => void;
  onProgress: (event: StreamProgressEvent) => void;
  onResult: (result: TransformResult) => void;
}

const FETCH_TIMEOUT_MS = 60_000;
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const TRANSFORM_ENDPOINT = "/api/transform";

function createRequestBody(url: string): TransformRequest {
  return { url: url.trim() };
}

function isNdjsonResponse(response: Response): boolean {
  return (response.headers.get("Content-Type") ?? "").includes(
    NDJSON_CONTENT_TYPE,
  );
}

function parseStreamEvent(line: string): StreamEvent {
  const parsed: unknown = JSON.parse(line);

  if (!isStreamEvent(parsed)) {
    throw new Error("Invalid stream event");
  }

  return parsed;
}

function flushBufferedLines(
  chunk: string,
  onEvent: (event: StreamEvent) => void,
): string {
  const lines = chunk.split("\n");
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      onEvent(parseStreamEvent(trimmed));
    }
  }

  return remainder;
}

async function readNdjsonStream(
  response: Response,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<TransformError | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    return createUnexpectedResponseError();
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminalEvent = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer = flushBufferedLines(
        buffer + decoder.decode(value, { stream: true }),
        (event) => {
          if (event.type !== "progress") {
            sawTerminalEvent = true;
          }

          onEvent(event);
        },
      );
    }

    const trailingContent = buffer.trim();
    if (trailingContent.length > 0) {
      const event = parseStreamEvent(trailingContent);
      if (event.type !== "progress") {
        sawTerminalEvent = true;
      }

      onEvent(event);
    }
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

  if (sawTerminalEvent || !signal.aborted) {
    return sawTerminalEvent ? null : createUnexpectedResponseError();
  }

  return signal.reason instanceof DOMException &&
    signal.reason.name === "TimeoutError"
    ? createTimeoutError()
    : null;
}

function handleStreamEvent(
  event: StreamEvent,
  handlers: ClientTransformHandlers,
): void {
  if (event.type === "progress") {
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

function handleJsonFallback(
  data: unknown,
  onError: ClientTransformHandlers["onError"],
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
  handlers: ClientTransformHandlers,
): Promise<void> {
  if (isNdjsonResponse(response)) {
    const streamError = await readNdjsonStream(
      response,
      signal,
      (streamEvent) => handleStreamEvent(streamEvent, handlers),
    );

    if (streamError) {
      handlers.onError(streamError);
    }

    return;
  }

  handleJsonFallback(await response.json(), handlers.onError);
}

export async function submitTransformRequest(
  url: string,
  handlers: ClientTransformHandlers,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(TRANSFORM_ENDPOINT, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(createRequestBody(url)),
    signal,
  });

  await handleTransformResponse(response, signal, handlers);
}

export function createClientTransformSignal(
  abortController: AbortController,
): AbortSignal {
  return AbortSignal.any([
    abortController.signal,
    AbortSignal.timeout(FETCH_TIMEOUT_MS),
  ]);
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
  return error instanceof DOMException && error.name === "AbortError";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}
