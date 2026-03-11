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

      const contentType = res.headers.get("Content-Type") ?? "";

      if (contentType.includes(NDJSON_CONTENT_TYPE)) {
        await readStreamResponse(res);
      } else {
        handleJsonFallback(await res.json());
      }
    } catch (error) {
      if (isAbortError(error)) {
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

  async function readStreamResponse(res: Response) {
    const reader = res.body?.getReader();
    if (!reader) {
      onError(createUnexpectedResponseError());
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        handleStreamEvent(JSON.parse(trimmed) as StreamEvent);
      }
    }

    if (buffer.trim().length > 0) {
      handleStreamEvent(JSON.parse(buffer.trim()) as StreamEvent);
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
          label="URL"
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
