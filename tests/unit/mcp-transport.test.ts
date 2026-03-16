import path from "node:path";
import { describe, expect, it } from "vitest";
import { getFetchUrlTransportConfig } from "@/lib/mcp";

describe("getFetchUrlTransportConfig", () => {
  it("launches the fetch-url MCP entrypoint through the current Node binary", () => {
    const transport = getFetchUrlTransportConfig("/var/task");

    expect(transport.command).toBe(process.execPath);
    expect(transport.args).toEqual([
      path.join(
        "/var/task",
        "node_modules",
        "@j0hanz",
        "fetch-url-mcp",
        "dist",
        "index.js",
      ),
    ]);
  });
});
