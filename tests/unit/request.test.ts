import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/transform/route";
import { validateTransformRequest, ValidationError } from "@/lib/validate";
import { transformUrl } from "@/lib/transform";
import type { TransformResponse } from "@/lib/api";

vi.mock("@/lib/transform", () => ({
  transformUrl: vi.fn(),
}));

const UNKNOWN_FIELDS = [
  { extra: true },
  { skipNoiseRemoval: true },
  { forceRefresh: true },
  { maxInlineChars: 100 },
] as const;
const INVALID_BODIES = [null, [], "string"] as const;
const VALID_URL = "https://example.com";
const transformUrlMock = vi.mocked(transformUrl);
const SUCCESS_RESPONSE: TransformResponse = {
  ok: true,
  result: {
    url: VALID_URL,
    metadata: {},
    markdown: "# Example",
    fromCache: false,
    fetchedAt: "2026-03-11T00:00:00.000Z",
    contentSize: 9,
    truncated: false,
  },
};

function expectValidationError(body: unknown, matcher?: RegExp): void {
  expect(() => validateTransformRequest(body)).toThrow(ValidationError);

  if (matcher) {
    expect(() => validateTransformRequest(body)).toThrow(matcher);
  }
}

function createJsonRequest(body: string): Request {
  return new Request("http://localhost/api/transform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function parseNdjsonLine(line: string): unknown {
  return JSON.parse(line);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("validateTransformRequest", () => {
  it("accepts a valid request with only url", () => {
    const result = validateTransformRequest({ url: VALID_URL });
    expect(result).toEqual({ url: VALID_URL });
  });

  it("trims whitespace from url", () => {
    const result = validateTransformRequest({
      url: "  https://example.com  ",
    });
    expect(result).toEqual({ url: "https://example.com" });
  });

  it("rejects empty url", () => {
    expectValidationError({ url: "" });
  });

  it("rejects missing url", () => {
    expectValidationError({});
  });

  it("rejects non-http url scheme", () => {
    expectValidationError({ url: "ftp://example.com" });
    expectValidationError({ url: "file:///etc/passwd" });
  });

  it("rejects invalid url", () => {
    expectValidationError({ url: "not-a-url" });
  });

  it.each(UNKNOWN_FIELDS)("rejects unknown fields: %j", (field) => {
    expectValidationError(
      {
        url: VALID_URL,
        ...field,
      },
      /Unknown field/,
    );
  });

  it.each(INVALID_BODIES)("rejects invalid body: %j", (body) => {
    expectValidationError(body);
  });
});

describe("POST /api/transform", () => {
  it("returns a validation error for invalid JSON payloads", async () => {
    const response = await POST(createJsonRequest("not json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON body.",
        retryable: false,
      },
    });
  });

  it("streams progress and the final result as NDJSON", async () => {
    transformUrlMock.mockImplementation((_request, onProgress) => {
      onProgress?.({
        progress: 2,
        total: 8,
        message: "Fetching page",
      });
      return Promise.resolve(SUCCESS_RESPONSE);
    });

    const response = await POST(
      createJsonRequest(JSON.stringify({ url: VALID_URL })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    expect(transformUrlMock).toHaveBeenCalledWith(
      { url: VALID_URL },
      expect.any(Function),
      expect.any(AbortSignal),
    );

    const lines = (await response.text())
      .trim()
      .split("\n")
      .map(parseNdjsonLine);

    expect(lines).toEqual([
      {
        type: "progress",
        progress: 2,
        total: 8,
        message: "Fetching page",
      },
      {
        type: "result",
        ...SUCCESS_RESPONSE,
      },
    ]);
  });
});
