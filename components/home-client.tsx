"use client";

import { useReducer } from "react";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import TransformForm from "@/components/form";
import TransformResultPanel from "@/components/result";
import TransformProgress from "@/components/progress";
import type {
  TransformResult,
  TransformError,
  StreamProgressEvent,
} from "@/lib/errors/transform";
import {
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from "@/lib/errors/transform";

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
  | { type: "error"; error: TransformError };

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
        ? { ...state, loading: true, progress: null }
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
  }
}

export default function HomeClient() {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  return (
    <>
      <TransformForm
        onResult={handleResult}
        onError={handleError}
        onLoading={handleLoading}
        onProgress={handleProgress}
      />

      {state.loading && state.progress && (
        <TransformProgress
          progress={state.progress.progress}
          total={state.progress.total}
          message={state.progress.message}
        />
      )}

      {state.error && !state.loading && (
        <Alert severity="error" variant="outlined">
          <Typography variant="body2" fontWeight="medium">
            Error: {state.error.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Code: {state.error.code}
            {state.error.retryable && " · Retryable"}
          </Typography>
        </Alert>
      )}

      {state.result && !state.loading && (
        <TransformResultPanel result={state.result} />
      )}
    </>
  );
}
