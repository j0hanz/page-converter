'use client';

import {
  type Dispatch,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
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
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from '@/lib/api';
import {
  isAbortError,
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

interface State {
  result: TransformResult | null;
  error: TransformError | null;
  loading: boolean;
  progress: StreamProgressEvent | null;
}

interface RequestSession {
  abortController: AbortController;
  requestId: number;
}

interface RequestControllerOptions {
  clearInput: () => void;
  dispatch: Dispatch<Action>;
}

export interface RequestController {
  beginRequest: () => RequestSession;
  dispatchIfActive: (
    session: RequestSession,
    action: Exclude<Action, { type: 'submit' | 'dismiss_error' }>
  ) => void;
  isActiveRequest: (session: RequestSession) => boolean;
  releaseRequest: (session: RequestSession) => void;
  stopActiveRequest: () => void;
}

type Action =
  | { type: 'submit' }
  | { type: 'progress'; event: StreamProgressEvent }
  | { type: 'result'; result: TransformResult }
  | { type: 'error'; error: TransformError }
  | { type: 'dismiss_error' };

const initialState: State = {
  result: null,
  error: null,
  loading: false,
  progress: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return { ...initialState, loading: true };
    case 'progress':
      if (state.progress && isTerminalStreamProgressEvent(state.progress)) {
        return state;
      }

      return {
        ...state,
        progress: normalizeStreamProgressEvent(action.event, state.progress),
      };
    case 'result':
      return { ...initialState, result: action.result };
    case 'error':
      return { ...initialState, error: action.error };
    case 'dismiss_error':
      return { ...state, error: null };
  }
}

export function createRequestController({
  clearInput,
  dispatch,
}: RequestControllerOptions): RequestController {
  let requestId = 0;
  let abortController: AbortController | null = null;

  function stopActiveRequest() {
    requestId += 1;

    const activeAbortController = abortController;
    abortController = null;
    activeAbortController?.abort();
  }

  function isActiveRequest(session: RequestSession): boolean {
    return requestId === session.requestId;
  }

  return {
    beginRequest() {
      stopActiveRequest();

      const session = {
        abortController: new AbortController(),
        requestId: requestId + 1,
      };

      requestId = session.requestId;
      abortController = session.abortController;

      return session;
    },
    dispatchIfActive(session, action) {
      if (!isActiveRequest(session)) {
        return;
      }

      dispatch(action);
      if (action.type === 'result' || action.type === 'error') {
        clearInput();
      }
    },
    isActiveRequest,
    releaseRequest(session) {
      if (
        isActiveRequest(session) &&
        abortController === session.abortController
      ) {
        abortController = null;
      }
    },
    stopActiveRequest,
  };
}

export default function HomeClient() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const formRef = useRef<TransformFormHandle>(null);
  const { error, loading, progress, result } = state;
  const showProgress = loading && progress !== null;
  const showError = !loading && error !== null;
  const showResult = !loading && result !== null;

  const clearInput = useCallback(() => {
    formRef.current?.clear();
  }, []);
  const requestControllerRef = useRef<RequestController | null>(null);

  if (!requestControllerRef.current) {
    requestControllerRef.current = createRequestController({
      clearInput,
      dispatch,
    });
  }

  const requestController = requestControllerRef.current;

  function dismissError() {
    dispatch({ type: 'dismiss_error' });
  }

  function createRequestHandlers(session: RequestSession) {
    return {
      onProgress(event: StreamProgressEvent) {
        requestController.dispatchIfActive(session, {
          type: 'progress',
          event,
        });
      },
      onResult(result: TransformResult) {
        requestController.dispatchIfActive(session, { type: 'result', result });
      },
      onError(error: TransformError) {
        requestController.dispatchIfActive(session, { type: 'error', error });
      },
    };
  }

  function handleSubmit(url: string) {
    const session = requestController.beginRequest();
    dispatch({ type: 'submit' });

    void submitTransformRequest(
      url,
      createRequestHandlers(session),
      session.abortController.signal
    )
      .catch((error) => {
        if (
          !requestController.isActiveRequest(session) ||
          isAbortError(error)
        ) {
          return;
        }

        dispatch({ type: 'error', error: mapClientTransformError(error) });
        clearInput();
      })
      .finally(() => {
        requestController.releaseRequest(session);
      });
  }

  useEffect(() => {
    return () => {
      requestController.stopActiveRequest();
    };
  }, [requestController]);

  return (
    <>
      <TransformForm ref={formRef} loading={loading} onSubmit={handleSubmit} />

      <div aria-live="polite">
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
      </div>
    </>
  );
}
