// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeClient from "@/components/home-client";
import type { TransformResult } from "@/lib/api";

const VALID_URL = "https://example.com";
const SUCCESS_RESULT: TransformResult = {
  url: VALID_URL,
  markdown: "# Example",
  fromCache: false,
  fetchedAt: "2026-03-10T00:00:00Z",
  contentSize: 9,
  truncated: false,
  metadata: {},
};

describe("HomeClient", () => {
  it("transitions from streamed progress to the final result", async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrl(VALID_URL);

    stream.emit({
      type: "progress",
      progress: 1,
      total: 8,
      message: "Fetching",
    });

    await waitFor(() => {
      expect(screen.getByText("Fetching")).toBeInTheDocument();
    });

    stream.emit({ type: "result", ok: true, result: SUCCESS_RESULT });
    stream.close();

    await waitFor(() => {
      expect(screen.getByText("Example")).toBeInTheDocument();
    });
    expect(screen.queryByText("Fetching")).not.toBeInTheDocument();
  });

  it("transitions from streamed progress to an error and allows dismissing it", async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrl(VALID_URL);

    stream.emit({
      type: "progress",
      progress: 1,
      total: 8,
      message: "Fetching",
    });

    await waitFor(() => {
      expect(screen.getByText("Fetching")).toBeInTheDocument();
    });

    stream.emit({
      type: "result",
      ok: false,
      error: {
        code: "FETCH_ERROR",
        message: "Upstream unavailable",
        retryable: true,
      },
    });
    stream.close();

    await waitFor(() => {
      expect(screen.getByText("Upstream unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByText("Fetching")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByLabelText(/close/i));

    await waitFor(() => {
      expect(
        screen.queryByText("Upstream unavailable"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows a retryable error when the network request fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network fail"));

    render(<HomeClient />);
    await submitUrl(VALID_URL);

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByText(/retryable/i)).toBeInTheDocument();
  });
});

async function submitUrl(url: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/URL/i);

  await user.clear(input);
  await user.type(input, url);
  await user.click(screen.getByRole("button", { name: /convert/i }));
}

function createControlledStreamResponse() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(nextController) {
      controller = nextController;
    },
  });

  return {
    response: {
      headers: new Headers({ "Content-Type": "application/x-ndjson" }),
      body,
    },
    emit(line: unknown) {
      controller?.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
    },
    close() {
      controller?.close();
    },
  };
}
