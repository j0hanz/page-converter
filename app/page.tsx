"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import TransformForm from "@/components/form";
import TransformResultPanel from "@/components/result";
import type { TransformResult, TransformError } from "@/lib/errors/transform";

export default function Home() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [loading, setLoading] = useState(false);

  function handleResult(nextResult: TransformResult) {
    setResult(nextResult);
    setError(null);
  }

  function handleError(nextError: TransformError) {
    setError(nextError);
    setResult(null);
  }

  return (
    <Box sx={{ minHeight: "100vh", py: 8 }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          <div>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Page Converter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Turn web pages into clean Markdown
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Paste a public URL to extract clean Markdown.
            </Typography>
          </div>

          <TransformForm
            onResult={handleResult}
            onError={handleError}
            onLoading={setLoading}
          />

          {loading && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ py: 4 }}
            >
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Converting…
              </Typography>
            </Stack>
          )}

          {error && !loading && (
            <Alert severity="error" variant="outlined">
              <Typography variant="body2" fontWeight="medium">
                Error: {error.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Code: {error.code}
                {error.retryable && " · Retryable"}
              </Typography>
            </Alert>
          )}

          {result && !loading && <TransformResultPanel result={result} />}
        </Stack>
      </Container>
    </Box>
  );
}
