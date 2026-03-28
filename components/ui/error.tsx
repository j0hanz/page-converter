'use client';

import { Component, type ReactNode } from 'react';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import CenterMessage from '@/components/ui/center-message';
import { StatusShell } from '@/components/ui/status-shell';

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
