import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  CallToolResult,
  Progress,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";

export interface FetchUrlArgs {
  url: string;
}

const CLIENT_INFO = { name: "page-converter", version: "1.0.0" };
const FETCH_URL_TOOL_NAME = "fetch-url";
const FETCH_URL_TRANSPORT_COMMAND = getFetchUrlTransportCommand();
const FETCH_URL_TRANSPORT_ARGS: string[] = [];

export type ProgressCallback = (progress: Progress) => void;
type FetchUrlClient = { client: Client; transport: StdioClientTransport };

function noop() {}

function createTransport() {
  return new StdioClientTransport({
    command: FETCH_URL_TRANSPORT_COMMAND,
    args: FETCH_URL_TRANSPORT_ARGS,
  });
}

function createClient(): Client {
  const client = new Client(CLIENT_INFO);
  client.onerror = noop;
  client.onclose = noop;

  return client;
}

function createFetchUrlClient(): FetchUrlClient {
  return {
    client: createClient(),
    transport: createTransport(),
  };
}

function createProgressOptions(onProgress?: ProgressCallback) {
  return onProgress ? { onprogress: onProgress } : undefined;
}

async function closeClientSafely(client: Client) {
  try {
    await client.close();
  } catch {
    // Ignore close errors
  }
}

export async function callFetchUrl(
  args: FetchUrlArgs,
  onProgress?: ProgressCallback,
): Promise<CallToolResult> {
  const { client, transport } = createFetchUrlClient();

  try {
    await client.connect(transport);
    const result = await client.callTool(
      {
        name: FETCH_URL_TOOL_NAME,
        arguments: { url: args.url },
      },
      undefined,
      createProgressOptions(onProgress),
    );

    return result as CallToolResult;
  } finally {
    await closeClientSafely(client);
  }
}

function getFetchUrlTransportCommand(): string {
  return path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "fetch-url-mcp.cmd" : "fetch-url-mcp",
  );
}
