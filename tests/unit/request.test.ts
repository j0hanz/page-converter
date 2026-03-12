import { describe, it, expect } from "vitest";
import { validateTransformRequest, ValidationError } from "@/lib/validate";

const UNKNOWN_FIELDS = [
  { extra: true },
  { skipNoiseRemoval: true },
  { forceRefresh: true },
  { maxInlineChars: 100 },
] as const;

const INVALID_BODIES = [null, [], "string"] as const;

describe("validateTransformRequest", () => {
  it("accepts a valid request with only url", () => {
    const result = validateTransformRequest({ url: "https://example.com" });
    expect(result).toEqual({ url: "https://example.com" });
  });

  it("trims whitespace from url", () => {
    const result = validateTransformRequest({
      url: "  https://example.com  ",
    });
    expect(result).toEqual({ url: "https://example.com" });
  });

  it("rejects empty url", () => {
    expect(() => validateTransformRequest({ url: "" })).toThrow(
      ValidationError,
    );
  });

  it("rejects missing url", () => {
    expect(() => validateTransformRequest({})).toThrow(ValidationError);
  });

  it("rejects non-http url scheme", () => {
    expect(() =>
      validateTransformRequest({ url: "ftp://example.com" }),
    ).toThrow(ValidationError);
    expect(() =>
      validateTransformRequest({ url: "file:///etc/passwd" }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid url", () => {
    expect(() => validateTransformRequest({ url: "not-a-url" })).toThrow(
      ValidationError,
    );
  });

  it.each(UNKNOWN_FIELDS)("rejects unknown fields: %j", (field) => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        ...field,
      }),
    ).toThrow(ValidationError);
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        ...field,
      }),
    ).toThrow(/Unknown field/);
  });

  it.each(INVALID_BODIES)("rejects invalid body: %j", (body) => {
    expect(() => validateTransformRequest(body)).toThrow(ValidationError);
  });
});
