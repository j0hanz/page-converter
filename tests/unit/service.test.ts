import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCode,
  McpError,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { transformUrl } from "@/lib/transform";
import { callFetchUrl } from "@/lib/mcp";

vi.mock("@/lib/mcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp")>();
  return {
    ...actual,
    callFetchUrl: vi.fn(),
  };
});

const callFetchUrlMock = vi.mocked(callFetchUrl);

const successResult: CallToolResult = {
  content: [],
  structuredContent: {
    result: {
      url: "https://example.com",
      markdown: "# Example",
      metadata: {},
      fromCache: false,
      fetchedAt: "2026-03-11T00:00:00.000Z",
      contentSize: 9,
      truncated: false,
    },
  },
};

describe("transformUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("retries once for retryable MCP transport errors", async () => {
    callFetchUrlMock
      .mockRejectedValueOnce(
        new McpError(ErrorCode.RequestTimeout, "Request timed out"),
      )
      .mockResolvedValueOnce(successResult);

    const response = await transformUrl({ url: "https://example.com" });

    expect(callFetchUrlMock).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(true);
  });

  it("does not retry non-retryable MCP transport errors", async () => {
    callFetchUrlMock.mockRejectedValueOnce(
      new McpError(ErrorCode.MethodNotFound, "tools/call not supported"),
    );

    const response = await transformUrl({ url: "https://example.com" });

    expect(callFetchUrlMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.error.code).toBe("INTERNAL_ERROR");
    expect(response.error.retryable).toBe(false);
  });
});
