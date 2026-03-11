import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface FetchUrlArgs {
  url: string;
  skipNoiseRemoval?: boolean;
  forceRefresh?: boolean;
  maxInlineChars?: number;
}

const CLIENT_INFO = { name: "page-converter", version: "1.0.0" };
const FETCH_URL_TRANSPORT_COMMAND = "npx";
const FETCH_URL_TRANSPORT_ARGS = ["-y", "@j0hanz/fetch-url-mcp@latest"];

export async function callFetchUrl(
  args: FetchUrlArgs,
): Promise<CallToolResult> {
  const client = new Client(CLIENT_INFO);

  const transport = new StdioClientTransport({
    command: FETCH_URL_TRANSPORT_COMMAND,
    args: FETCH_URL_TRANSPORT_ARGS,
  });

  client.onerror = (error) => {
    console.error("[MCP client error]", error);
  };

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: "fetch-url",
      arguments: buildToolArguments(args),
    });

    return result as CallToolResult;
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

function buildToolArguments(args: FetchUrlArgs): Record<string, unknown> {
  const toolArgs: Record<string, unknown> = { url: args.url };
  setOptionalToolArgument(toolArgs, "skipNoiseRemoval", args.skipNoiseRemoval);
  setOptionalToolArgument(toolArgs, "forceRefresh", args.forceRefresh);
  setOptionalToolArgument(toolArgs, "maxInlineChars", args.maxInlineChars);
  return toolArgs;
}

function setOptionalToolArgument(
  toolArgs: Record<string, unknown>,
  key: string,
  value: boolean | number | undefined,
): void {
  if (value !== undefined) {
    toolArgs[key] = value;
  }
}
