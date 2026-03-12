import { describe, it, expect } from "vitest";
import { validateTransformRequest, ValidationError } from "@/lib/validate";

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

  it("rejects unknown fields", () => {
    expect(() =>
      validateTransformRequest({ url: "https://example.com", extra: true }),
    ).toThrow(ValidationError);
    expect(() =>
      validateTransformRequest({ url: "https://example.com", extra: true }),
    ).toThrow(/Unknown field/);
  });

  it("rejects skipNoiseRemoval as unknown field", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        skipNoiseRemoval: true,
      }),
    ).toThrow(/Unknown field/);
  });

  it("rejects forceRefresh as unknown field", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        forceRefresh: true,
      }),
    ).toThrow(/Unknown field/);
  });

  it("rejects maxInlineChars as unknown field", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        maxInlineChars: 100,
      }),
    ).toThrow(/Unknown field/);
  });

  it("rejects null body", () => {
    expect(() => validateTransformRequest(null)).toThrow(ValidationError);
  });

  it("rejects array body", () => {
    expect(() => validateTransformRequest([])).toThrow(ValidationError);
  });

  it("rejects non-object body", () => {
    expect(() => validateTransformRequest("string")).toThrow(ValidationError);
  });
});
