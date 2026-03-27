'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import TransformForm from '@/components/features/form';
import TransformResultPanel from '@/components/features/result';
import { MarkdownSkeleton } from '@/components/ui/loading';
import PreviewPlaceholder from '@/components/ui/preview-placeholder';
import { deriveViewState, useTransform } from '@/hooks/use-transform';
import { sx } from '@/lib/theme';

const LOADING_PANEL_SX = { ...sx.markdownPanel, ...sx.transitionCell } as const;

export default function HomeClient() {
  const {
    dismissError,
    error,
    formRef,
    handleAction,
    isPending,
    progress,
    result,
    retry,
  } = useTransform();

  const viewState = deriveViewState(isPending, error, result);

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm ref={formRef} action={handleAction} />

      <Box aria-live="polite" sx={sx.transitionGrid}>
        <Fade in={viewState === 'idle'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            <PreviewPlaceholder />
          </Box>
        </Fade>

        <Fade in={viewState === 'loading'} mountOnEnter unmountOnExit>
          <Paper sx={LOADING_PANEL_SX}>
            {progress?.message && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {progress.message}...
              </Typography>
            )}
            <MarkdownSkeleton />
          </Paper>
        </Fade>

        <Fade in={viewState === 'error'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            {error && (
              <Alert severity="error" onClose={dismissError}>
                <AlertTitle>{error.message}</AlertTitle>
                Code: {error.code}
                {error.retryable && (
                  <>
                    {' · Retryable '}
                    <Button
                      color="inherit"
                      size="small"
                      onClick={retry}
                      sx={{ ml: 1, textDecoration: 'underline' }}
                    >
                      Retry
                    </Button>
                  </>
                )}
              </Alert>
            )}
          </Box>
        </Fade>

        <Fade in={viewState === 'result'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            {result && <TransformResultPanel result={result} />}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
