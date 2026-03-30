'use client';

import { Component, type ReactNode } from 'react';

import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import TransformAlert from '@/components/ui/alert';
import { StatusShell } from '@/components/ui/status-shell';

import type { TransformErrorCode } from '@/lib/api';
import { fluid, sx } from '@/lib/theme';

interface CenterMessageProps {
  code?: TransformErrorCode;
  message: ReactNode;
  statusCode?: number;
  children?: ReactNode;
}

const CENTER_MESSAGE_SX = {
  ...sx.markdownPanel,
  minHeight: fluid.panelMaxHeight,
  display: 'grid',
  alignContent: 'center',
} as const;

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
