"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <ErrorState
      error={error}
      fallbackMessage="An unexpected error occurred."
      minHeight="50vh"
      reset={reset}
    />
  );
}
