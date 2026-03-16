import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/transform": ["./node_modules/@j0hanz/fetch-url-mcp/**/*"],
  },
};

export default nextConfig;
