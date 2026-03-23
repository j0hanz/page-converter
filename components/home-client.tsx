'use client';

import { useEffect, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';

import TransformForm, { type TransformFormHandle } from '@/components/form';
import { TransformProgress } from '@/components/loading';
import TransformResultPanel from '@/components/result';
import type {
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from '@/lib/api';
import {
  isAbortError,
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';
import { sx as themeSx } from '@/lib/theme';

function useHomeClientModel() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<TransformFormHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
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

  function handleProgressEvent(
    requestController: AbortController,
    event: StreamProgressEvent
  ) {
    if (!isActiveRequest(requestController)) {
      return;
    }

    setProgress((prev) => {
      if (prev && isTerminalStreamProgressEvent(prev)) {
        return prev;
      }

      return normalizeStreamProgressEvent(event, prev);
    });
  }

  function handleRequestResult(
    requestController: AbortController,
    nextResult: TransformResult
  ) {
    completeRequest(requestController, () => {
      setResult(nextResult);
      setProgress(null);
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
      setProgress(null);
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
    setProgress(null);

    const handlers = {
      onProgress(event: StreamProgressEvent) {
        handleProgressEvent(abortController, event);
      },
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
    progress,
    result,
  };
}

export default function HomeClient() {
  const {
    dismissError,
    error,
    formRef,
    handleAction,
    loading,
    progress,
    result,
  } = useHomeClientModel();

  const showProgress = loading && progress !== null;
  const showError = !loading && error !== null;
  const showResult = !loading && result !== null;

  return (
    <Box sx={themeSx.flexColumn}>
      <TransformForm ref={formRef} loading={loading} action={handleAction} />

      <Box aria-live="polite" sx={themeSx.flexColumn}>
        <Collapse in={showProgress} unmountOnExit>
          {progress && (
            <TransformProgress
              progress={progress.progress}
              total={progress.total}
              message={progress.message}
            />
          )}
        </Collapse>

        <Collapse in={showError} unmountOnExit>
          {error && (
            <Alert severity="error" onClose={dismissError}>
              <AlertTitle>{error.message}</AlertTitle>
              Code: {error.code}
              {error.retryable && ' · Retryable'}
            </Alert>
          )}
        </Collapse>

        <Collapse in={showResult} unmountOnExit>
          {result && <TransformResultPanel result={result} />}
        </Collapse>
      </Box>
    </Box>
  );
}
