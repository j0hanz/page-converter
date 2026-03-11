import { describe, it, expect } from "vitest";
import { parseMcpResult } from "@/lib/mcp/result";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function errorResult(code: string, message: string): CallToolResult {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ ok: false, error: { code, message } }),
      },
    ],
    isError: true,
  };
}

describe("error mapper", () => {
  it("maps VALIDATION_ERROR to non-retryable", () => {
    const parsed = parseMcpResult(errorResult("VALIDATION_ERROR", "Blocked"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(parsed.error.retryable).toBe(false);
  });

  it("maps FETCH_ERROR to retryable", () => {
    const parsed = parseMcpResult(errorResult("FETCH_ERROR", "Network"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("FETCH_ERROR");
    expect(parsed.error.retryable).toBe(true);
  });

  it("maps HTTP_503 to retryable HTTP_ERROR", () => {
    const parsed = parseMcpResult(
      errorResult("HTTP_503", "Service Unavailable"),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("HTTP_ERROR");
    expect(parsed.error.statusCode).toBe(503);
    expect(parsed.error.retryable).toBe(true);
  });

  it("maps HTTP_404 to non-retryable HTTP_ERROR", () => {
    const parsed = parseMcpResult(errorResult("HTTP_404", "Not Found"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("HTTP_ERROR");
    expect(parsed.error.statusCode).toBe(404);
    expect(parsed.error.retryable).toBe(false);
  });

  it("maps ABORTED to retryable", () => {
    const parsed = parseMcpResult(errorResult("ABORTED", "Cancelled"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("ABORTED");
    expect(parsed.error.retryable).toBe(true);
  });

  it("maps queue_full to retryable QUEUE_FULL", () => {
    const parsed = parseMcpResult(
      errorResult("queue_full", "Worker pool busy"),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("QUEUE_FULL");
    expect(parsed.error.retryable).toBe(true);
  });

  it("maps unknown error to non-retryable INTERNAL_ERROR", () => {
    const parsed = parseMcpResult(errorResult("SOMETHING_ELSE", "Unknown"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
    expect(parsed.error.retryable).toBe(false);
  });

  it("handles unparseable error response gracefully", () => {
    const raw: CallToolResult = {
      content: [{ type: "text" as const, text: "not json at all" }],
      isError: true,
    };
    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
  });

  it("reads machine-readable error payloads from structuredContent", () => {
    const raw: CallToolResult = {
      content: [],
      isError: true,
      structuredContent: {
        error: { code: "FETCH_ERROR", message: "Upstream unavailable" },
      },
    };

    const parsed = parseMcpResult(raw);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("FETCH_ERROR");
    expect(parsed.error.retryable).toBe(true);
  });
});
