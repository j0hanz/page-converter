"use client";

import { useState } from "react";
import TransformForm from "@/components/form";
import TransformResultPanel from "@/components/result";
import type {
  TransformResult,
  TransformError,
  TransformResponse,
} from "@/lib/errors/transform";
import {
  createNetworkError,
  hasTransformError,
  hasTransformResult,
} from "@/lib/errors/transform";

interface RetryOptions {
  forceRefresh: boolean;
}

export default function Home() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [loading, setLoading] = useState(false);

  function handleResult(nextResult: TransformResult) {
    setResult(nextResult);
    setError(null);
  }

  function handleError(nextError: TransformError) {
    setError(nextError);
    setResult(null);
  }

  async function handleRetry(options: RetryOptions) {
    if (!result) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await retryTransform(result.url, options);
      if (hasTransformResult(response)) {
        setResult(response.result);
      } else if (hasTransformError(response)) {
        handleError(response.error);
      }
    } catch {
      handleError(createNetworkError());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Page Converter
          </h1>
          <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">
            Turn web pages into clean Markdown
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            Paste a public URL to extract clean Markdown.
          </p>
        </div>

        <TransformForm
          onResult={handleResult}
          onError={handleError}
          onLoading={setLoading}
        />

        {loading && (
          <div className="flex items-center gap-3 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Converting…
            </span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Error: {error.message}
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Code: {error.code}
              {error.retryable && " · Retryable"}
            </p>
          </div>
        )}

        {result && !loading && (
          <TransformResultPanel result={result} onRetry={handleRetry} />
        )}
      </main>
    </div>
  );
}

async function retryTransform(
  url: string,
  options: RetryOptions,
): Promise<TransformResponse> {
  const response = await fetch("/api/transform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      forceRefresh: options.forceRefresh,
    }),
  });

  return (await response.json()) as TransformResponse;
}
