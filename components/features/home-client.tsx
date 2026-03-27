'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

import TransformForm from '@/components/features/form';
import TransformResultPanel from '@/components/features/result';
import CenterMessage from '@/components/ui/center-message';
import { MarkdownSkeleton } from '@/components/ui/loading';
import PreviewPlaceholder from '@/components/ui/preview-placeholder';

import { deriveViewState, useTransform } from '@/hooks/use-transform';
import type { ViewState } from '@/hooks/use-transform';

import { sx } from '@/lib/theme';

const LOADING_PANEL_SX = { ...sx.markdownPanel, ...sx.transitionCell } as const;

function ViewStateSection({
  children,
  state,
  visibleState,
}: {
  children: ReactNode;
  state: ViewState;
  visibleState: ViewState;
}) {
  return (
    <Fade in={state === visibleState} mountOnEnter unmountOnExit>
      <Box sx={sx.transitionCell}>{children}</Box>
    </Fade>
  );
}

export default function HomeClient() {
  const { error, formRef, handleAction, isPending, result } = useTransform();

  const viewState = deriveViewState(isPending, error, result);

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm
        ref={formRef}
        action={handleAction}
        isPending={isPending}
      />

      <Box
        aria-live="polite"
        aria-busy={viewState === 'loading'}
        sx={sx.transitionGrid}
      >
        <ViewStateSection state={viewState} visibleState="idle">
          <PreviewPlaceholder />
        </ViewStateSection>

        <Fade in={viewState === 'loading'} mountOnEnter unmountOnExit>
          <Paper sx={LOADING_PANEL_SX}>
            <MarkdownSkeleton />
          </Paper>
        </Fade>

        <ViewStateSection state={viewState} visibleState="error">
          {error && (
            <CenterMessage message={error.message} color="error.main" />
          )}
        </ViewStateSection>

        <ViewStateSection state={viewState} visibleState="result">
          {result && <TransformResultPanel result={result} />}
        </ViewStateSection>
      </Box>
    </Box>
  );
}
