"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type {
  TransformResult,
  TransformError,
  TransformResponse,
} from "@/lib/errors/transform";
import {
  createNetworkError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
} from "@/lib/errors/transform";

interface TransformFormProps {
  onResult: (result: TransformResult) => void;
  onError: (error: TransformError) => void;
  onLoading: (loading: boolean) => void;
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
}: TransformFormProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function setLoadingState(loading: boolean) {
    setSubmitting(loading);
    onLoading(loading);
  }

  function handleResponse(data: TransformResponse) {
    if (hasTransformResult(data)) {
      onResult(data.result);
      return;
    }

    if (hasTransformError(data)) {
      onError(data.error);
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
      handleResponse((await res.json()) as TransformResponse);
    } catch {
      onError(createNetworkError());
    } finally {
      setLoadingState(false);
    }
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
