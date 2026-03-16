import { describe, it, expect } from "vitest";
import { parseMcpResult } from "@/lib/mcp";
import {
  createStreamProgressEvent,
  createTransformError,
  isTerminalStreamProgressEvent,
  isTransformError,
  isTransformErrorResponse,
  normalizeStreamProgressEvent,
  STREAM_PROGRESS_TOTAL,
} from "@/lib/api";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ParsedResult = ReturnType<typeof parseMcpResult>;
type ParsedErrorResult = Extract<ParsedResult, { ok: false }>["error"];

function textContent(text: string): CallToolResult["content"] {
  return [{ type: "text", text }] satisfies CallToolResult["content"];
}

function errorResult(code: string, message: string): CallToolResult {
  return {
    content: textContent(
      JSON.stringify({ ok: false, error: { code, message } }),
    ),
    isError: true,
  };
}

function expectErrorResult(parsed: ParsedResult): ParsedErrorResult {
  expect(parsed.ok).toBe(false);
  if (parsed.ok) {
    throw new Error("Expected parseMcpResult to return an error result.");
  }

  return parsed.error;
}

describe("error mapper", () => {
  it.each([
    {
      code: "VALIDATION_ERROR",
      message: "Blocked",
      expectedCode: "VALIDATION_ERROR",
      retryable: false,
    },
    {
      code: "FETCH_ERROR",
      message: "Network",
      expectedCode: "FETCH_ERROR",
      retryable: true,
    },
    {
      code: "HTTP_503",
      message: "Service Unavailable",
      expectedCode: "HTTP_ERROR",
      retryable: true,
      statusCode: 503,
    },
    {
      code: "HTTP_404",
      message: "Not Found",
      expectedCode: "HTTP_ERROR",
      retryable: false,
      statusCode: 404,
    },
    {
      code: "ABORTED",
      message: "Cancelled",
      expectedCode: "ABORTED",
      retryable: true,
    },
    {
      code: "queue_full",
      message: "Worker pool busy",
      expectedCode: "QUEUE_FULL",
      retryable: true,
    },
    {
      code: "SOMETHING_ELSE",
      message: "Unknown",
      expectedCode: "INTERNAL_ERROR",
      retryable: false,
    },
  ])(
    "maps $code to $expectedCode",
    ({ code, message, expectedCode, retryable, statusCode }) => {
      const error = expectErrorResult(
        parseMcpResult(errorResult(code, message)),
      );

      expect(error.code).toBe(expectedCode);
      expect(error.retryable).toBe(retryable);

      if (statusCode !== undefined) {
        expect(error.statusCode).toBe(statusCode);
      }
    },
  );

  it("handles unparseable error response gracefully", () => {
    const raw: CallToolResult = {
      content: textContent("not json at all"),
      isError: true,
    };
    const error = expectErrorResult(parseMcpResult(raw));
    expect(error.code).toBe("INTERNAL_ERROR");
  });

  it("reads machine-readable error payloads from structuredContent", () => {
    const raw: CallToolResult = {
      content: [],
      isError: true,
      structuredContent: {
        error: { code: "FETCH_ERROR", message: "Upstream unavailable" },
      },
    };

    const error = expectErrorResult(parseMcpResult(raw));
    expect(error.code).toBe("FETCH_ERROR");
    expect(error.retryable).toBe(true);
  });

  it("defaults streamed progress events to the shared total", () => {
    expect(createStreamProgressEvent(3)).toEqual({
      type: "progress",
      progress: 3,
      total: STREAM_PROGRESS_TOTAL,
      message: "",
    });
  });

  it("normalizes progress monotonically against the previous event", () => {
    const previous = createStreamProgressEvent(
      5,
      STREAM_PROGRESS_TOTAL,
      "Step 5",
    );
    const normalized = normalizeStreamProgressEvent(
      createStreamProgressEvent(3, 0, "Stale step"),
      previous,
    );

    expect(normalized).toEqual({
      type: "progress",
      progress: 5,
      total: STREAM_PROGRESS_TOTAL,
      message: "Stale step",
    });
  });

  it("detects terminal streamed progress events", () => {
    expect(
      isTerminalStreamProgressEvent(
        createStreamProgressEvent(STREAM_PROGRESS_TOTAL, STREAM_PROGRESS_TOTAL),
      ),
    ).toBe(true);
    expect(isTerminalStreamProgressEvent(createStreamProgressEvent(7, 8))).toBe(
      false,
    );
  });

  it("recognizes valid transform error objects", () => {
    expect(
      isTransformError(createTransformError("FETCH_ERROR", "Upstream failed")),
    ).toBe(true);
    expect(isTransformError({ code: "FETCH_ERROR", retryable: true })).toBe(
      false,
    );
  });

  it("recognizes valid transform error responses", () => {
    expect(
      isTransformErrorResponse({
        ok: false,
        error: createTransformError("VALIDATION_ERROR", "Invalid URL"),
      }),
    ).toBe(true);
    expect(
      isTransformErrorResponse({
        ok: false,
        error: { code: "VALIDATION_ERROR" },
      }),
    ).toBe(false);
  });
});
