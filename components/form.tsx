"use client";

import { useEffect, useId, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type {
  TransformResult,
  TransformError,
  StreamEvent,
  StreamProgressEvent,
} from "@/lib/api";
import {
  NDJSON_CONTENT_TYPE,
  createNetworkError,
  createTimeoutError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
  isTransformError,
  isTransformErrorResponse,
} from "@/lib/api";

interface TransformFormProps {
  onResult: (result: TransformResult) => void;
  onError: (error: TransformError) => void;
  onLoading: (loading: boolean) => void;
  onProgress: (event: StreamProgressEvent) => void;
}

interface TransformRequestBody {
  url: string;
}

const TRANSFORM_ENDPOINT = "/api/transform";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const FETCH_TIMEOUT_MS = 60_000;

function createRequestBody(url: string): TransformRequestBody {
  return { url: url.trim() };
}

function isNdjsonResponse(response: Response): boolean {
  return (response.headers.get("Content-Type") ?? "").includes(
    NDJSON_CONTENT_TYPE,
  );
}

function parseStreamEvent(line: string): StreamEvent {
  return JSON.parse(line) as StreamEvent;
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
  onEvent: (event: StreamEvent) => void,
): Promise<TransformError | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    return createUnexpectedResponseError();
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer = flushBufferedLines(
        buffer + decoder.decode(value, { stream: true }),
        onEvent,
      );
    }

    const trailingContent = buffer.trim();
    if (trailingContent.length > 0) {
      onEvent(parseStreamEvent(trailingContent));
    }
  } finally {
    reader.releaseLock();
  }

  return null;
}

export default function TransformForm({
  onResult,
  onError,
  onLoading,
  onProgress,
}: TransformFormProps) {
  const urlInputId = useId();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function setLoadingState(loading: boolean) {
    setSubmitting(loading);
    onLoading(loading);
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "progress") {
      onProgress(event);
      return;
    }

    if (hasTransformResult(event)) {
      onResult(event.result);
      return;
    }

    if (hasTransformError(event)) {
      onError(event.error);
      return;
    }

    onError(createUnexpectedResponseError());
  }

  function handleCancel(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    abortControllerRef.current?.abort();
  }

  function handleUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingState(true);
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const signal = AbortSignal.any([
      abortController.signal,
      AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ]);

    try {
      const res = await fetch(TRANSFORM_ENDPOINT, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(createRequestBody(url)),
        signal,
      });

      if (isNdjsonResponse(res)) {
        const streamError = await readNdjsonStream(res, handleStreamEvent);
        if (streamError) {
          onError(streamError);
        }
      } else {
        handleJsonFallback(await res.json());
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      if (isTimeoutError(error)) {
        onError(createTimeoutError());
        return;
      }

      if (isTransformError(error)) {
        onError(error);
        return;
      }

      onError(createNetworkError());
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      setLoadingState(false);
    }
  }

  function handleJsonFallback(data: unknown) {
    if (isTransformErrorResponse(data)) {
      onError(data.error);
      return;
    }

    onError(createUnexpectedResponseError());
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          id={urlInputId}
          label="Paste a public URL to convert"
          type="url"
          required
          fullWidth
          placeholder="https://example.com"
          value={url}
          onChange={handleUrlChange}
          disabled={submitting}
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1, flex: { md: "2 1 0" } }}
        />
        {submitting ? (
          <Button
            type="button"
            variant="contained"
            fullWidth
            color="error"
            onClick={handleCancel}
            sx={{ maxWidth: { sm: 150 }, flex: { md: "1 1 0" } }}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ maxWidth: { sm: 150 }, flex: { md: "1 1 0" } }}
          >
            Convert
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}
