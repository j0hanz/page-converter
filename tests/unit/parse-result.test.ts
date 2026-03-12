import { describe, it, expect } from "vitest";
import { parseMcpResult } from "@/lib/mcp";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function textContent(text: string): CallToolResult["content"] {
  return [{ type: "text" as const, text }];
}

const sampleResult = {
  ok: true,
  result: {
    url: "https://example.com",
    resolvedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    title: "Example Domain",
    metadata: {
      description: "An example page",
      author: "IANA",
    },
    markdown: "# Example\n\nThis is an example.",
    fromCache: true,
    fetchedAt: "2026-03-10T12:00:00.000Z",
    contentSize: 42,
    truncated: false,
  },
};

describe("parseMcpResult", () => {
  it("maps structuredContent to TransformResult preserving all fields", () => {
    const raw: CallToolResult = {
      content: textContent(JSON.stringify(sampleResult)),
      structuredContent: sampleResult,
    };

    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.result.url).toBe("https://example.com");
    expect(parsed.result.resolvedUrl).toBe("https://example.com/");
    expect(parsed.result.finalUrl).toBe("https://example.com/");
    expect(parsed.result.title).toBe("Example Domain");
    expect(parsed.result.metadata.description).toBe("An example page");
    expect(parsed.result.metadata.author).toBe("IANA");
    expect(parsed.result.markdown).toBe("# Example\n\nThis is an example.");
    expect(parsed.result.fromCache).toBe(true);
    expect(parsed.result.fetchedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(parsed.result.contentSize).toBe(42);
    expect(parsed.result.truncated).toBe(false);
  });

  it("maps isError: true to TransformError", () => {
    const raw: CallToolResult = {
      content: textContent(
        JSON.stringify({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Blocked URL" },
        }),
      ),
      isError: true,
    };

    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;

    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(parsed.error.retryable).toBe(false);
  });

  it("falls back to text content parsing when structuredContent is absent", () => {
    const raw: CallToolResult = {
      content: textContent(JSON.stringify(sampleResult)),
    };

    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.result.url).toBe("https://example.com");
    expect(parsed.result.markdown).toBe("# Example\n\nThis is an example.");
  });

  it("returns INTERNAL_ERROR for empty content", () => {
    const raw: CallToolResult = { content: [] };
    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns INTERNAL_ERROR for unparseable text content", () => {
    const raw: CallToolResult = { content: textContent("not json") };
    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
  });
});
