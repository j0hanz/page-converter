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
  const showProgress = state.loading && state.progress !== null;
  const showError = !state.loading && state.error !== null;
  const showResult = !state.loading && state.result !== null;

  function handleResult(result: TransformResult) {
    dispatch({ type: "result", result });
  }

  function handleError(error: TransformError) {
    dispatch({ type: "error", error });
  }

  function handleLoading(loading: boolean) {
    dispatch({ type: "loading", loading });
  }

  function handleProgress(event: StreamProgressEvent) {
    dispatch({ type: "progress", event });
  }

  function dismissError() {
    dispatch({ type: "dismiss_error" });
  }

  return (
    <>
      <TransformForm
        onResult={handleResult}
        onError={handleError}
        onLoading={handleLoading}
        onProgress={handleProgress}
      />

      <div aria-live="polite">
        <Collapse in={showProgress} unmountOnExit>
          {state.progress && (
            <TransformProgress
              progress={state.progress.progress}
              total={state.progress.total}
              message={state.progress.message}
            />
          )}
        </Collapse>

        <Collapse in={showError} unmountOnExit>
          {state.error && (
            <Alert severity="error" onClose={dismissError}>
              <AlertTitle>{state.error.message}</AlertTitle>
              Code: {state.error.code}
              {state.error.retryable && " · Retryable"}
            </Alert>
          )}
        </Collapse>

        <Collapse in={showResult} unmountOnExit>
          {state.result && <TransformResultPanel result={state.result} />}
        </Collapse>
      </div>
    </>
  );
}
