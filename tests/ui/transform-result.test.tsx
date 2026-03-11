import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransformResultPanel from "@/components/transform-result";
import type { TransformResult } from "@/lib/errors/transform-errors";

const baseResult: TransformResult = {
  url: "https://example.com",
  resolvedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  title: "Example Domain",
  metadata: {
    description: "An example page",
    author: "IANA",
  },
  markdown: "# Example\n\nThis is an example.",
  fromCache: false,
  fetchedAt: "2026-03-10T12:00:00.000Z",
  contentSize: 42,
  truncated: false,
};

describe("TransformResultPanel", () => {
  it("renders summary section with title, URLs, cache status, and size", () => {
    renderPanel();

    expect(screen.getByText("Example Domain")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Fresh")).toBeInTheDocument();
    expect(screen.getByText("42 chars")).toBeInTheDocument();
  });

  it("renders metadata section", () => {
    renderPanel();

    expect(screen.getByText("An example page")).toBeInTheDocument();
    expect(screen.getByText("IANA")).toBeInTheDocument();
  });

  it("renders markdown content in a pre element", () => {
    renderPanel();

    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain("# Example");
    expect(pre?.textContent).toContain("This is an example.");
  });

  it("shows cached status when fromCache is true", () => {
    renderPanel({ result: { ...baseResult, fromCache: true } });
    expect(screen.getByText("Cached")).toBeInTheDocument();
  });

  it("shows truncation warning and retry button when truncated", () => {
    const onRetry = vi.fn();
    renderPanel({ result: { ...baseResult, truncated: true }, onRetry });

    expect(screen.getByText(/content was truncated/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", {
      name: /retry with fresh fetch/i,
    });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it("does not show truncation warning when not truncated", () => {
    renderPanel();
    expect(
      screen.queryByText(/content was truncated/i),
    ).not.toBeInTheDocument();
  });

  it("shows copy markdown button", () => {
    renderPanel();
    expect(screen.getByText("Copy Markdown")).toBeInTheDocument();
  });

  it("copies markdown to clipboard on button click", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderPanel();
    fireEvent.click(screen.getByText("Copy Markdown"));

    expect(writeText).toHaveBeenCalledWith("# Example\n\nThis is an example.");
  });

  it("hides metadata section when empty", () => {
    const noMeta = { ...baseResult, metadata: {} };
    renderPanel({ result: noMeta });
    expect(screen.queryByText("Metadata")).not.toBeInTheDocument();
  });
});

function renderPanel({
  result = baseResult,
  onRetry = vi.fn<(options: { forceRefresh: boolean }) => void>(),
}: {
  result?: TransformResult;
  onRetry?: (options: { forceRefresh: boolean }) => void;
} = {}) {
  return render(<TransformResultPanel result={result} onRetry={onRetry} />);
}
