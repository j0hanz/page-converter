'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import type {
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from '@/lib/api';
import { isAbortError } from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

export type ViewState = 'idle' | 'loading' | 'error' | 'result';

interface TransformRequestHandlers {
  onError: (error: TransformError) => void;
  onProgress: (event: StreamProgressEvent) => void;
  onResult: (result: TransformResult) => void;
}

export function deriveViewState(
  isPending: boolean,
  error: TransformError | null,
  result: TransformResult | null
): ViewState {
  if (!isPending && result !== null) return 'result';
  if (!isPending && error !== null) return 'error';
  if (isPending) return 'loading';
  return 'idle';
}

export function useTransform() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  function resetRequestState(): void {
    setError(null);
    setResult(null);
    setProgress(null);
  }

  function isActiveRequest(requestController: AbortController): boolean {
    return abortControllerRef.current === requestController;
  }

  function finalizeActiveRequest(
    requestController: AbortController,
    onComplete: () => void
  ): void {
    if (!isActiveRequest(requestController)) {
      return;
    }

    abortControllerRef.current = null;
    onComplete();
  }

  function beginRequest(): AbortController {
    abortControllerRef.current?.abort();
    const requestController = new AbortController();
    abortControllerRef.current = requestController;
    resetRequestState();
    return requestController;
  }

  function handleRequestResult(
    requestController: AbortController,
    nextResult: TransformResult
  ): void {
    finalizeActiveRequest(requestController, () => {
      setResult(nextResult);
      formRef.current?.reset();
    });
  }

  function handleRequestError(
    requestController: AbortController,
    nextError: TransformError
  ): void {
    finalizeActiveRequest(requestController, () => {
      setError(nextError);
    });
  }

  function createRequestHandlers(
    requestController: AbortController
  ): TransformRequestHandlers {
    return {
      onProgress(event) {
        if (!isActiveRequest(requestController)) {
          return;
        }

        setProgress(event);
      },
      onResult(result) {
        handleRequestResult(requestController, result);
      },
      onError(nextError) {
        handleRequestError(requestController, nextError);
      },
    };
  }

  function submitUrl(url: string): void {
    lastUrlRef.current = url;

    startTransition(async () => {
      const requestController = beginRequest();
      const handlers = createRequestHandlers(requestController);

      try {
        await submitTransformRequest(url, handlers, requestController.signal);
      } catch (err) {
        if (isAbortError(err) || !isActiveRequest(requestController)) {
          return;
        }

        handleRequestError(requestController, mapClientTransformError(err));
      }
    });
  }

  function handleAction(formData: FormData): void {
    const url = formData.get('url');
    if (typeof url !== 'string' || url === '') {
      return;
    }

    submitUrl(url);
  }

  function retry(): void {
    if (lastUrlRef.current) {
      submitUrl(lastUrlRef.current);
    }
  }

  function dismissError(): void {
    setError(null);
  }

  return {
    dismissError,
    error,
    formRef,
    handleAction,
    isPending,
    progress,
    result,
    retry,
  };
}
