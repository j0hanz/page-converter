"use client";

import { useReducer } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Collapse from "@mui/material/Collapse";
import TransformForm from "@/components/form";
import TransformResultPanel from "@/components/result";
import { TransformProgress } from "@/components/loading";
import type {
  TransformResult,
  TransformError,
  StreamProgressEvent,
} from "@/lib/api";
import {
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from "@/lib/api";

interface State {
  result: TransformResult | null;
  error: TransformError | null;
  loading: boolean;
  progress: StreamProgressEvent | null;
}

type Action =
  | { type: "loading"; loading: boolean }
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

function clearResolvedState(state: State): State {
  return {
    ...state,
    result: null,
    error: null,
    progress: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return action.loading
        ? { ...initialState, loading: true }
        : { ...state, loading: false };
    case "progress":
      if (state.progress && isTerminalStreamProgressEvent(state.progress)) {
        return state;
      }
      return {
        ...state,
        progress: normalizeStreamProgressEvent(action.event, state.progress),
      };
    case "result":
      return {
        ...clearResolvedState(state),
        result: action.result,
      };
    case "error":
      return {
        ...clearResolvedState(state),
        error: action.error,
      };
    case "dismiss_error":
      return { ...state, error: null };
  }
}

export default function HomeClient() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { error, loading, progress, result } = state;
  const showProgress = loading && progress !== null;
  const showError = !loading && error !== null;
  const showResult = !loading && result !== null;
  const formHandlers = {
    onResult: (nextResult: TransformResult) =>
      dispatch({ type: "result", result: nextResult }),
    onError: (nextError: TransformError) =>
      dispatch({ type: "error", error: nextError }),
    onLoading: (nextLoading: boolean) =>
      dispatch({ type: "loading", loading: nextLoading }),
    onProgress: (event: StreamProgressEvent) =>
      dispatch({ type: "progress", event }),
  };

  function dismissError() {
    dispatch({ type: "dismiss_error" });
  }

  return (
    <>
      <TransformForm {...formHandlers} />

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
