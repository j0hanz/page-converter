import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransformResultPanel from "@/components/result";
import type { TransformResult } from "@/lib/errors/transform";

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
  it("renders details accordion collapsed by default", () => {
    renderPanel();

    const detailsButton = screen.getByRole("button", { name: /details/i });
    expect(detailsButton).toBeInTheDocument();
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
  });

  it("renders summary and metadata data when expanded", () => {
    renderPanel();

    const detailsButton = screen.getByRole("button", { name: /details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText("Example Domain")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Fresh")).toBeInTheDocument();
    expect(screen.getByText("42 chars")).toBeInTheDocument();
    expect(screen.getByText("An example page")).toBeInTheDocument();
    expect(screen.getByText("IANA")).toBeInTheDocument();
  });

  it("renders markdown preview by default", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("Example")).toBeInTheDocument();
    });
    expect(screen.getByText("This is an example.")).toBeInTheDocument();
    expect(document.querySelector("pre")).not.toBeInTheDocument();
  });

  it("renders raw markdown in code view", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /code/i }));

    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain("# Example");
    expect(pre?.textContent).toContain("This is an example.");
  });

  it("shows truncation warning when truncated", () => {
    renderPanel({ result: { ...baseResult, truncated: true } });
    expect(screen.getByText(/content was truncated/i)).toBeInTheDocument();
  });

  it("does not show truncation warning when not truncated", () => {
    renderPanel();
    expect(
      screen.queryByText(/content was truncated/i),
    ).not.toBeInTheDocument();
  });

  it("shows copy markdown button", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: /copy markdown/i }),
    ).toBeInTheDocument();
  });

  it("copies markdown to clipboard on button click", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /copy markdown/i }));

    expect(writeText).toHaveBeenCalledWith("# Example\n\nThis is an example.");
  });

  it("hides metadata section when empty", () => {
    const noMeta = { ...baseResult, metadata: {} };
    renderPanel({ result: noMeta });

    const detailsButton = screen.getByRole("button", { name: /details/i });
    fireEvent.click(detailsButton);

    expect(screen.queryByText("Metadata")).not.toBeInTheDocument();
  });
});

function renderPanel({
  result = baseResult,
}: {
  result?: TransformResult;
} = {}) {
  return render(<TransformResultPanel result={result} />);
}
