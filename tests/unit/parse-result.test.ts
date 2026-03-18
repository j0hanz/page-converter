import { describe, it, expect } from "vitest";
import { parseMcpResult } from "@/lib/mcp";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ParsedResult = ReturnType<typeof parseMcpResult>;
type ParsedSuccessResult = Extract<ParsedResult, { ok: true }>["result"];
type ParsedErrorResult = Extract<ParsedResult, { ok: false }>["error"];

function textContent(text: string): CallToolResult["content"] {
  return [{ type: "text", text }] satisfies CallToolResult["content"];
}

function expectSuccessResult(parsed: ParsedResult): ParsedSuccessResult {
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error("Expected parseMcpResult to return a success result.");
  }

  return parsed.result;
}

function expectErrorResult(parsed: ParsedResult): ParsedErrorResult {
  expect(parsed.ok).toBe(false);
  if (parsed.ok) {
    throw new Error("Expected parseMcpResult to return an error result.");
  }

  return parsed.error;
}

const sampleStructuredContent = {
  url: "https://example.com",
  inputUrl: "https://example.com",
  resolvedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  title: "Example Domain",
  metadata: {
    description: "An example page",
    author: "IANA",
    publishedAt: "2026-03-10T11:00:00.000Z",
  },
  markdown: "# Example\n\nThis is an example.",
  fromCache: true,
  fetchedAt: "2026-03-10T12:00:00.000Z",
  contentSize: 42,
  truncated: false,
};

describe("parseMcpResult", () => {
  it("maps structuredContent to TransformResult preserving all fields", () => {
    const raw: CallToolResult = {
      content: textContent(JSON.stringify(sampleStructuredContent)),
      structuredContent: sampleStructuredContent,
    };

    const result = expectSuccessResult(parseMcpResult(raw));

    expect(result.url).toBe("https://example.com");
    expect(result.resolvedUrl).toBe("https://example.com/");
    expect(result.finalUrl).toBe("https://example.com/");
    expect(result.title).toBe("Example Domain");
    expect(result.metadata.description).toBe("An example page");
    expect(result.metadata.author).toBe("IANA");
    expect(result.metadata.publishedAt).toBe("2026-03-10T11:00:00.000Z");
    expect(result.markdown).toBe("# Example\n\nThis is an example.");
    expect(result.fromCache).toBe(true);
    expect(result.fetchedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(result.contentSize).toBe(42);
    expect(result.truncated).toBe(false);
  });

  it("maps isError: true to TransformError", () => {
    const raw: CallToolResult = {
      content: textContent(
        JSON.stringify({
          error: "Blocked URL",
          code: "VALIDATION_ERROR",
          url: "https://example.com",
        }),
      ),
      isError: true,
    };

    const error = expectErrorResult(parseMcpResult(raw));
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.retryable).toBe(false);
  });

  it("falls back to text content parsing when structuredContent is absent", () => {
    const raw: CallToolResult = {
      content: textContent(JSON.stringify(sampleStructuredContent)),
    };

    const result = expectSuccessResult(parseMcpResult(raw));
    expect(result.url).toBe("https://example.com");
    expect(result.markdown).toBe("# Example\n\nThis is an example.");
  });

  it("returns INTERNAL_ERROR for empty content", () => {
    const raw: CallToolResult = { content: [] };
    const error = expectErrorResult(parseMcpResult(raw));
    expect(error.code).toBe("INTERNAL_ERROR");
  });

  it("returns INTERNAL_ERROR for unparseable text content", () => {
    const raw: CallToolResult = { content: textContent("not json") };
    const error = expectErrorResult(parseMcpResult(raw));
    expect(error.code).toBe("INTERNAL_ERROR");
  });
});
