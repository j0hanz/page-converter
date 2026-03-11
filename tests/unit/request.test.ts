import { describe, it, expect } from "vitest";
import {
  validateTransformRequest,
  ValidationError,
} from "@/lib/validation/request";

describe("validateTransformRequest", () => {
  it("accepts a valid request with only url", () => {
    const result = validateTransformRequest({ url: "https://example.com" });
    expect(result).toEqual({ url: "https://example.com" });
  });

  it("accepts a valid request with all optional fields", () => {
    const result = validateTransformRequest({
      url: "http://example.com/page",
      skipNoiseRemoval: true,
      forceRefresh: false,
      maxInlineChars: 5000,
    });
    expect(result).toEqual({
      url: "http://example.com/page",
      skipNoiseRemoval: true,
      forceRefresh: false,
      maxInlineChars: 5000,
    });
  });

  it("accepts maxInlineChars of 0", () => {
    const result = validateTransformRequest({
      url: "https://example.com",
      maxInlineChars: 0,
    });
    expect(result.maxInlineChars).toBe(0);
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

  it("rejects non-boolean skipNoiseRemoval", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        skipNoiseRemoval: "yes",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects non-boolean forceRefresh", () => {
    expect(() =>
      validateTransformRequest({ url: "https://example.com", forceRefresh: 1 }),
    ).toThrow(ValidationError);
  });

  it("rejects negative maxInlineChars", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        maxInlineChars: -1,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects non-integer maxInlineChars", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        maxInlineChars: 1.5,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects non-number maxInlineChars", () => {
    expect(() =>
      validateTransformRequest({
        url: "https://example.com",
        maxInlineChars: "100",
      }),
    ).toThrow(ValidationError);
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
