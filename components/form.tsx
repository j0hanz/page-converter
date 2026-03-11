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

export default function TransformForm({
  onResult,
  onError,
  onLoading,
}: TransformFormProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function buildRequestBody(): TransformRequestBody {
    return { url: url.trim() };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    onLoading(true);

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });

      const data = (await res.json()) as TransformResponse;

      if (hasTransformResult(data)) {
        onResult(data.result);
      } else if (hasTransformError(data)) {
        onError(data.error);
      } else {
        onError(createUnexpectedResponseError());
      }
    } catch {
      onError(createNetworkError());
    } finally {
      setSubmitting(false);
      onLoading(false);
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
          onChange={(e) => setUrl(e.target.value)}
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
