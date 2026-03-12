import { describe, it, expect } from "vitest";
import { validateTransformRequest, ValidationError } from "@/lib/validate";

const UNKNOWN_FIELDS = [
  { extra: true },
  { skipNoiseRemoval: true },
  { forceRefresh: true },
  { maxInlineChars: 100 },
] as const;
const INVALID_BODIES = [null, [], "string"] as const;
const VALID_URL = "https://example.com";

function expectValidationError(body: unknown, matcher?: RegExp): void {
  expect(() => validateTransformRequest(body)).toThrow(ValidationError);

  if (matcher) {
    expect(() => validateTransformRequest(body)).toThrow(matcher);
  }
}

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
