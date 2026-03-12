"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type {
  TransformResult,
  TransformError,
  StreamEvent,
  StreamProgressEvent,
} from "@/lib/errors/transform";
import {
  NDJSON_CONTENT_TYPE,
  createNetworkError,
  createUnexpectedResponseError,
} from "@/lib/errors/transform";

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

    if (event.type === "result") {
      if (event.ok) {
        onResult(event.result);
      } else {
        onError(event.error);
      }
      return;
    }

    onError(createUnexpectedResponseError());
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

    try {
      const requestBody: TransformRequestBody = { url: url.trim() };
      const res = await fetch(TRANSFORM_ENDPOINT, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
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
      <Stack spacing={2}>
        <TextField
          id="url"
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
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          loading={submitting}
          sx={{ alignSelf: "flex-start" }}
        >
          Convert
        </Button>
      </Stack>
    </Box>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isTransformErrorResponse(
  value: unknown,
): value is { ok: false; error: TransformError } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    ok?: unknown;
    error?: { code?: unknown; message?: unknown; retryable?: unknown };
  };

  return (
    candidate.ok === false &&
    candidate.error !== undefined &&
    typeof candidate.error.code === "string" &&
    typeof candidate.error.message === "string" &&
    typeof candidate.error.retryable === "boolean"
  );
}

function isTransformError(error: unknown): error is TransformError {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    "retryable" in error
  );
}
