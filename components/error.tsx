"use client";

import { Component, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export interface ErrorStateProps {
  error: Error & { digest?: string };
  fallbackMessage: string;
  minHeight: string;
  reset: () => void;
}

export function ErrorState({
  error,
  fallbackMessage,
  minHeight,
  reset,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight,
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          Something went wrong
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 400 }}
        >
          {fallbackMessage}
        </Typography>
        {error.digest && (
          <Typography variant="caption" color="text.disabled">
            Ref: {error.digest}
          </Typography>
        )}
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Stack>
    </Box>
  );
}

interface MarkdownErrorBoundaryProps {
  children: ReactNode;
}

interface MarkdownErrorBoundaryState {
  hasError: boolean;
}

export class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  override state: MarkdownErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return <Alert severity="error">Failed to render markdown preview.</Alert>;
    }

    return this.props.children;
  }
}
