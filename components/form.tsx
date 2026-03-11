"use client";

import { useState } from "react";
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

    try {
      const requestBody: TransformRequestBody = { url: url.trim() };
      const res = await fetch(TRANSFORM_ENDPOINT, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(requestBody),
      });

      const contentType = res.headers.get("Content-Type") ?? "";

      if (contentType.includes(NDJSON_CONTENT_TYPE)) {
        await readStreamResponse(res);
      } else {
        handleJsonFallback(await res.json());
      }
    } catch {
      onError(createNetworkError());
    } finally {
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
      if (done) break;

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
    const response = data as { ok?: boolean; error?: TransformError };

    if (response.ok === false && response.error) {
      onError(response.error);
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
