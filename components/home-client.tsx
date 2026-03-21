"use client";

import { useEffect, useReducer, useRef } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Collapse from "@mui/material/Collapse";
import TransformForm from "@/components/form";
import TransformResultPanel from "@/components/result";
import { TransformProgress } from "@/components/loading";
import type {
  TransformError,
  TransformResult,
  StreamProgressEvent,
} from "@/lib/api";
import {
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from "@/lib/api";
import {
  createClientTransformSignal,
  isAbortError,
  mapClientTransformError,
  submitTransformRequest,
} from "@/lib/client-transform";

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

type Action =
  | { type: "submit" }
  | { type: "progress"; event: StreamProgressEvent }
  | { type: "result"; result: TransformResult }
  | { type: "error"; error: TransformError }
  | { type: "dismiss_error" };

const initialState: State = {
  result: null,
  error: null,
  loading: false,
  progress: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "submit":
      return { ...initialState, loading: true };
    case "progress":
      if (state.progress && isTerminalStreamProgressEvent(state.progress)) {
        return state;
      }

      return {
        ...state,
        progress: normalizeStreamProgressEvent(action.event, state.progress),
      };
    case "result":
      return { ...initialState, result: action.result };
    case "error":
      return { ...initialState, error: action.error };
    case "dismiss_error":
      return { ...state, error: null };
  }
}

export default function HomeClient() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const { error, loading, progress, result } = state;
  const showProgress = loading && progress !== null;
  const showError = !loading && error !== null;
  const showResult = !loading && result !== null;

  function dismissError() {
    dispatch({ type: "dismiss_error" });
  }

  function invalidateActiveRequest(): void {
    requestIdRef.current += 1;
    const abortController = abortControllerRef.current;

    abortControllerRef.current = null;
    abortController?.abort();
  }

  function createRequestSession(): RequestSession {
    invalidateActiveRequest();

    const requestId = requestIdRef.current + 1;
    const abortController = new AbortController();

    requestIdRef.current = requestId;
    abortControllerRef.current = abortController;

    return { abortController, requestId };
  }

  function isActiveRequest(session: RequestSession): boolean {
    return requestIdRef.current === session.requestId;
  }

  function dispatchIfRequestActive(
    session: RequestSession,
    action: Exclude<Action, { type: "submit" | "dismiss_error" }>,
  ): void {
    if (isActiveRequest(session)) {
      dispatch(action);
    }
  }

  function releaseRequestSession(session: RequestSession): void {
    if (
      isActiveRequest(session) &&
      abortControllerRef.current === session.abortController
    ) {
      abortControllerRef.current = null;
    }
  }

  function createRequestHandlers(session: RequestSession) {
    return {
      onProgress(event: StreamProgressEvent) {
        dispatchIfRequestActive(session, { type: "progress", event });
      },
      onResult(result: TransformResult) {
        dispatchIfRequestActive(session, { type: "result", result });
      },
      onError(error: TransformError) {
        dispatchIfRequestActive(session, { type: "error", error });
      },
    };
  }

  function handleSubmit(url: string) {
    const session = createRequestSession();
    dispatch({ type: "submit" });

    void submitTransformRequest(
      url,
      createRequestHandlers(session),
      createClientTransformSignal(session.abortController),
    )
      .catch((error) => {
        if (!isActiveRequest(session) || isAbortError(error)) {
          return;
        }

        dispatch({ type: "error", error: mapClientTransformError(error) });
      })
      .finally(() => {
        releaseRequestSession(session);
      });
  }

  useEffect(() => {
    return () => {
      invalidateActiveRequest();
    };
  }, []);

  return (
    <>
      <TransformForm loading={loading} onSubmit={handleSubmit} />

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
              {error.retryable && " · Retryable"}
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
