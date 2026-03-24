'use client';

import { useEffect, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

import TransformForm, { type TransformFormHandle } from '@/components/form';
import { MarkdownSkeleton } from '@/components/loading';
import PreviewPlaceholder from '@/components/preview-placeholder';
import TransformResultPanel from '@/components/result';
import type { TransformError, TransformResult } from '@/lib/api';
import { isAbortError } from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';
import { sx } from '@/lib/theme';

type ViewState = 'idle' | 'loading' | 'error' | 'result';

function deriveViewState(
  loading: boolean,
  error: TransformError | null,
  result: TransformResult | null
): ViewState {
  if (!loading && result !== null) return 'result';
  if (!loading && error !== null) return 'error';
  if (loading) return 'loading';
  return 'idle';
}

function useHomeClientModel() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<TransformFormHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  function isActiveRequest(requestController: AbortController): boolean {
    return abortControllerRef.current === requestController;
  }

  function completeRequest(
    requestController: AbortController,
    onComplete: () => void
  ) {
    if (!isActiveRequest(requestController)) {
      return;
    }

    abortControllerRef.current = null;
    onComplete();
  }

  function handleRequestResult(
    requestController: AbortController,
    nextResult: TransformResult
  ) {
    completeRequest(requestController, () => {
      setResult(nextResult);
      setLoading(false);
      formRef.current?.clear();
    });
  }

  function handleRequestError(
    requestController: AbortController,
    nextError: TransformError
  ) {
    completeRequest(requestController, () => {
      setError(nextError);
      setLoading(false);
    });
  }

  function handleAction(formData: FormData) {
    const url = formData.get('url');
    if (typeof url !== 'string' || url === '') {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setResult(null);

    const handlers = {
      onProgress() {},
      onResult(res: TransformResult) {
        handleRequestResult(abortController, res);
      },
      onError(err: TransformError) {
        handleRequestError(abortController, err);
      },
    };

    void submitTransformRequest(url, handlers, abortController.signal).catch(
      (err) => {
        if (isAbortError(err) || !isActiveRequest(abortController)) {
          return;
        }

        handleRequestError(abortController, mapClientTransformError(err));
      }
    );
  }

  function dismissError() {
    setError(null);
  }

  return {
    dismissError,
    error,
    formRef,
    handleAction,
    loading,
    result,
  };
}

export default function HomeClient() {
  const { dismissError, error, formRef, handleAction, loading, result } =
    useHomeClientModel();

  const viewState = deriveViewState(loading, error, result);

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm ref={formRef} loading={loading} action={handleAction} />

      <Box aria-live="polite" sx={sx.transitionGrid}>
        <Fade in={viewState === 'idle'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            <PreviewPlaceholder />
          </Box>
        </Fade>

        <Fade in={viewState === 'loading'} mountOnEnter unmountOnExit>
          <Paper sx={{ ...sx.markdownPanel, ...sx.transitionCell }}>
            <MarkdownSkeleton />
          </Paper>
        </Fade>

        <Fade in={viewState === 'error'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            {error && (
              <Alert severity="error" onClose={dismissError}>
                <AlertTitle>{error.message}</AlertTitle>
                Code: {error.code}
                {error.retryable && ' · Retryable'}
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
