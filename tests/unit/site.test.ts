import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("returns localhost when no deployment url is configured", () => {
    const siteUrl = resolveSiteUrl({});

    expect(siteUrl.toString()).toBe("http://localhost:3000/");
  });

  it("prefers an explicitly configured site url", () => {
    const siteUrl = resolveSiteUrl({
      NEXT_PUBLIC_APP_URL: "https://page-converter.example.com/app?x=1",
    });

    expect(siteUrl.toString()).toBe("https://page-converter.example.com/");
  });

  it("normalizes bare hostnames from platform env vars", () => {
    const siteUrl = resolveSiteUrl({
      VERCEL_URL: "page-converter.vercel.app",
    });

    expect(siteUrl.toString()).toBe("https://page-converter.vercel.app/");
  });

  it("falls back to localhost when the configured site url is invalid", () => {
    const siteUrl = resolveSiteUrl({
      SITE_URL: "://bad-url",
    });

    expect(siteUrl.toString()).toBe("http://localhost:3000/");
  });
});
