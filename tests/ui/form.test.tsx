import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransformForm from "@/components/form";

const onResult = vi.fn();
const onError = vi.fn();
const onLoading = vi.fn();

describe("TransformForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders URL input, checkboxes, and submit button", () => {
    renderForm();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skip noise removal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/force refresh/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /convert/i }),
    ).toBeInTheDocument();
  });

  it("submits valid URL and calls onResult on success", async () => {
    const mockResult = {
      url: "https://example.com",
      markdown: "# Test",
      fromCache: false,
      fetchedAt: "2026-03-10T00:00:00Z",
      contentSize: 6,
      truncated: false,
      metadata: {},
    };

    mockJsonResponse({ ok: true, result: mockResult });
    renderForm();
    submitUrl("https://example.com");

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(mockResult);
    });

    expect(onLoading).toHaveBeenCalledWith(true);
    expect(onLoading).toHaveBeenCalledWith(false);
  });

  it("calls onError on API error response", async () => {
    const mockError = {
      code: "VALIDATION_ERROR",
      message: "Bad URL",
      retryable: false,
    };

    mockJsonResponse({ ok: false, error: mockError });
    renderForm();
    submitUrl("https://bad.example");

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it("calls onError on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network fail"));

    renderForm();
    submitUrl("https://example.com");

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INTERNAL_ERROR", retryable: true }),
      );
    });
  });

  it("disables form during submission", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderForm();
    submitUrl("https://example.com");

    await waitFor(() => {
      expect(screen.getByLabelText(/URL/i)).toBeDisabled();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    // Resolve to clean up
    if (!resolveFetch) {
      throw new Error("Fetch resolver was not initialized.");
    }

    resolveFetch({ json: () => Promise.resolve({ ok: true, result: {} }) });
  });
});

function renderForm() {
  return render(
    <TransformForm
      onResult={onResult}
      onError={onError}
      onLoading={onLoading}
    />,
  );
}

function submitUrl(url: string) {
  fireEvent.change(screen.getByLabelText(/URL/i), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: /convert/i }));
}

function mockJsonResponse(payload: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(payload),
  });
}
