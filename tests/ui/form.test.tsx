import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransformForm from "@/components/form";
import type { TransformResult } from "@/lib/api";

const onResult = vi.fn();
const onError = vi.fn();
const onLoading = vi.fn();
const onProgress = vi.fn();
const VALID_URL = "https://example.com";
const SUCCESS_RESULT: TransformResult = {
  url: VALID_URL,
  markdown: "# Test",
  fromCache: false,
  fetchedAt: "2026-03-10T00:00:00Z",
  contentSize: 6,
  truncated: false,
  metadata: {},
};

function createAbortError(): DOMException {
  return new DOMException("The user aborted a request.", "AbortError");
}

describe("TransformForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders URL input and submit button", () => {
    renderForm();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /convert/i }),
    ).toBeInTheDocument();
  });

  it("submits valid URL and calls onResult on success", async () => {
    mockStreamResponse([
      { type: "progress", progress: 1, total: 8, message: "Fetching" },
      { type: "result", ok: true, result: SUCCESS_RESULT },
    ]);
    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(SUCCESS_RESULT);
    });

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ type: "progress", progress: 1 }),
    );
    expect(onLoading).toHaveBeenCalledWith(true);
    expect(onLoading).toHaveBeenCalledWith(false);
  });

  it("forwards multiple streamed progress events before the result", async () => {
    mockStreamResponse([
      { type: "progress", progress: 1, total: 8, message: "Preparing request" },
      { type: "progress", progress: 3, total: 8, message: "Checking cache" },
      { type: "result", ok: true, result: SUCCESS_RESULT },
    ]);

    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(SUCCESS_RESULT);
    });

    expect(onProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "progress", progress: 1 }),
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "progress", progress: 3 }),
    );
  });

  it("calls onError on API error response", async () => {
    const mockError = {
      code: "VALIDATION_ERROR",
      message: "Bad URL",
      retryable: false,
    };

    mockStreamResponse([{ type: "result", ok: false, error: mockError }]);
    renderForm();
    submitUrl("https://bad.example");

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it("calls onError on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network fail"));

    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INTERNAL_ERROR", retryable: true }),
      );
    });
  });

  it("does not surface an error when the request is aborted", async () => {
    global.fetch = vi.fn().mockRejectedValue(createAbortError());

    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(onLoading).toHaveBeenLastCalledWith(false);
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("calls onError for JSON validation error responses", async () => {
    const mockError = {
      code: "VALIDATION_ERROR",
      message: "Invalid URL",
      retryable: false,
    };

    mockJsonResponse({ ok: false, error: mockError });
    renderForm();
    submitUrl("https://bad.example");

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it("disables URL input and shows Cancel button during submission", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(screen.getByLabelText(/URL/i)).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();
    });

    expect(
      screen.queryByRole("button", { name: /convert/i }),
    ).not.toBeInTheDocument();

    // Resolve to clean up
    if (!resolveFetch) {
      throw new Error("Fetch resolver was not initialized.");
    }

    resolveFetch(
      createMockStreamResponse([
        { type: "result", ok: true, result: SUCCESS_RESULT },
      ]),
    );
  });

  it("aborts request and reverts to Convert when Cancel is clicked", async () => {
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((resolve, reject) => {
          void resolve;
          init.signal.addEventListener("abort", () => {
            reject(createAbortError());
          });
        }),
    );

    renderForm();
    submitUrl(VALID_URL);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(onLoading).toHaveBeenLastCalledWith(false);
      expect(
        screen.getByRole("button", { name: /convert/i }),
      ).toBeInTheDocument();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });
});

function renderForm() {
  return render(
    <TransformForm
      onResult={onResult}
      onError={onError}
      onLoading={onLoading}
      onProgress={onProgress}
    />,
  );
}

function submitUrl(url: string) {
  fireEvent.change(screen.getByLabelText(/URL/i), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: /convert/i }));
}

function createNdjsonStream(lines: unknown[]): ReadableStream<Uint8Array> {
  const text = lines.map((l) => JSON.stringify(l) + "\n").join("");
  const encoded = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
}

function createMockStreamResponse(lines: unknown[]) {
  return {
    headers: new Headers({ "Content-Type": "application/x-ndjson" }),
    body: createNdjsonStream(lines),
  };
}

function mockStreamResponse(lines: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(lines));
}

function mockJsonResponse(payload: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(payload),
  });
}
