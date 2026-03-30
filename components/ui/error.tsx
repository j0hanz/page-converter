'use client';

import { Component, type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import TransformAlert from '@/components/ui/alert';

import type { TransformErrorCode } from '@/lib/api';
import { fluid, sx } from '@/lib/theme';

interface StatusShellProps {
  action: ReactNode;
  children?: ReactNode;
  message: ReactNode;
  minHeight: string;
  title: ReactNode;
}

interface CenterMessageProps {
  code?: TransformErrorCode;
  message: ReactNode;
  statusCode?: number;
  children?: ReactNode;
}

const STATUS_SHELL_CONTAINER_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 4,
} as const;

const STATUS_MESSAGE_SX = { maxWidth: '45ch' } as const;

const CENTER_MESSAGE_SX = {
  ...sx.markdownPanel,
  minHeight: fluid.panelMaxHeight,
  display: 'grid',
  alignContent: 'center',
} as const;

export function StatusShell({
  action,
  children,
  message,
  minHeight,
  title,
}: StatusShellProps) {
  return (
    <Box sx={{ ...STATUS_SHELL_CONTAINER_SX, minHeight }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={STATUS_MESSAGE_SX}
        >
          {message}
        </Typography>
        {children}
        {action}
      </Stack>
    </Box>
  );
}

export function CenterMessage({
  code = 'INTERNAL_ERROR',
  message,
  statusCode,
  children,
}: CenterMessageProps) {
  return (
    <Paper sx={CENTER_MESSAGE_SX}>
      <TransformAlert code={code} message={message} statusCode={statusCode} />
      {children}
    </Paper>
  );
}

export interface ResettableErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

interface ErrorStateProps extends ResettableErrorProps {
  fallbackMessage: string;
  minHeight: string;
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
      return <CenterMessage message="Failed to render markdown preview." />;
    }

    return this.props.children;
  }
}
