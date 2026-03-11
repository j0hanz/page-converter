"use client";

import { useEffect, useRef, useState } from "react";
import type { TransformResult } from "@/lib/errors/transform-errors";

interface TransformResultProps {
  result: TransformResult;
  onRetry: (options: { forceRefresh: boolean }) => void;
}

interface DetailField {
  key: string;
  label: string;
  value: string;
  truncate?: boolean;
}

export default function TransformResultPanel({
  result,
  onRetry,
}: TransformResultProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const summaryFields = getSummaryFields(result);
  const metadataFields = getMetadataFields(result);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      if (copyResetTimeoutRef.current !== null) {
        clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Truncation Warning */}
      {result.truncated && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Content was truncated. The full page may be too large to return in
            one response.
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Try again with <strong>Force refresh</strong> enabled — this
            bypasses the server cache and may return the complete content.
          </p>
          <button
            onClick={() => onRetry({ forceRefresh: true })}
            className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            Retry with fresh fetch
          </button>
        </div>
      )}

      {/* Summary Section */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Summary
        </h3>
        <DetailList fields={summaryFields} />
      </section>

      {/* Metadata Section */}
      {metadataFields.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Metadata
          </h3>
          <DetailList fields={metadataFields} />
        </section>
      )}

      {/* Markdown Section */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Markdown
          </h3>
          <button
            onClick={handleCopy}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
        </div>
        <pre className="max-h-[600px] overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {result.markdown}
        </pre>
      </section>
    </div>
  );
}

function DetailList({ fields }: { fields: DetailField[] }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {fields.map((field) => (
          <DetailListRow key={field.key} field={field} />
        ))}
      </dl>
    </div>
  );
}

function DetailListRow({ field }: { field: DetailField }) {
  return (
    <>
      <dt className="font-medium text-zinc-600 dark:text-zinc-400">
        {field.label}
      </dt>
      <dd
        className={`${field.truncate ? "truncate " : ""}text-zinc-900 dark:text-zinc-100`}
      >
        {field.value}
      </dd>
    </>
  );
}

function getSummaryFields(result: TransformResult): DetailField[] {
  return [
    createDetailField("title", "Title", result.title),
    createDetailField("input-url", "Input URL", result.url, true),
    createDetailField("resolved-url", "Resolved URL", result.resolvedUrl, true),
    createDetailField("final-url", "Final URL", result.finalUrl, true),
    createDetailField("cache", "Cache", result.fromCache ? "Cached" : "Fresh"),
    createDetailField(
      "fetched",
      "Fetched",
      new Date(result.fetchedAt).toLocaleString(),
    ),
    createDetailField(
      "size",
      "Size",
      `${result.contentSize.toLocaleString()} chars`,
    ),
  ].filter(isDetailField);
}

function getMetadataFields(result: TransformResult): DetailField[] {
  return [
    createDetailField(
      "description",
      "Description",
      result.metadata.description,
    ),
    createDetailField("author", "Author", result.metadata.author),
    createDetailField("published", "Published", result.metadata.publishedDate),
    createDetailField("modified", "Modified", result.metadata.modifiedDate),
    createDetailField("image", "Image", result.metadata.image, true),
    createDetailField("favicon", "Favicon", result.metadata.favicon, true),
  ].filter(isDetailField);
}

function createDetailField(
  key: string,
  label: string,
  value: string | undefined,
  truncate = false,
): DetailField | null {
  if (!value) {
    return null;
  }

  return { key, label, value, truncate };
}

function isDetailField(field: DetailField | null): field is DetailField {
  return field !== null;
}
