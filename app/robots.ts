import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: siteUrl.origin,
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
