'use client';

import { Component, type ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface ResettableErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

interface ErrorStateProps extends ResettableErrorProps {
  fallbackMessage: string;
  minHeight: string;
}

interface StatusShellProps {
  action: ReactNode;
  children?: ReactNode;
  message: ReactNode;
  minHeight: string;
  title: ReactNode;
}

export function StatusShell({
  action,
  children,
  message,
  minHeight,
  title,
}: StatusShellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight,
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: '45ch' }}
        >
          {message}
        </Typography>
        {children}
        {action}
      </Stack>
    </Box>
  );
}

export function ErrorState({
  error,
  fallbackMessage,
  minHeight,
  reset,
}: ErrorStateProps) {
  return (
    <StatusShell
      title="Something went wrong"
      message={fallbackMessage}
      minHeight={minHeight}
      action={
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      }
    >
      {error.digest && (
        <Typography variant="caption" color="text.secondary">
          Ref: {error.digest}
        </Typography>
      )}
    </StatusShell>
  );
}

interface MarkdownErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
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

  override componentDidUpdate(prevProps: MarkdownErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  override render() {
    if (this.state.hasError) {
      return <Alert severity="error">Failed to render markdown preview.</Alert>;
    }

    return this.props.children;
  }
}
