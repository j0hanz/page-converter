import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  CallToolResult,
  Progress,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";
import type {
  TransformError,
  TransformMetadata,
  TransformResult,
} from "@/lib/api";
import { createInternalError, createTransformError } from "@/lib/api";

export interface FetchUrlArgs {
  url: string;
}

const CLIENT_INFO = { name: "page-converter", version: "1.0.0" };
const FETCH_URL_TOOL_NAME = "fetch-url";
const FETCH_URL_TRANSPORT_COMMAND = getFetchUrlTransportCommand();
const FETCH_URL_TRANSPORT_ARGS: string[] = [];

export type ProgressCallback = (progress: Progress) => void;

interface McpInstance {
  client: Client;
  transport: StdioClientTransport;
}

interface McpGlobalState {
  __mcpInstance?: McpInstance;
  __mcpConnecting?: Promise<Client>;
}

const globalForMcp = globalThis as typeof globalThis & McpGlobalState;

function createTransport() {
  return new StdioClientTransport({
    command: FETCH_URL_TRANSPORT_COMMAND,
    args: FETCH_URL_TRANSPORT_ARGS,
  });
}

function resetInstance() {
  globalForMcp.__mcpInstance = undefined;
}

function createClient(): Client {
  const client = new Client(CLIENT_INFO);

  client.onerror = () => {
    resetInstance();
  };

  client.onclose = () => {
    resetInstance();
  };

  return client;
}

async function getConnectedClient(): Promise<Client> {
  if (globalForMcp.__mcpInstance) {
    return globalForMcp.__mcpInstance.client;
  }

  if (globalForMcp.__mcpConnecting) {
    return globalForMcp.__mcpConnecting;
  }

  globalForMcp.__mcpConnecting = (async () => {
    const transport = createTransport();
    const client = createClient();

    try {
      await client.connect(transport);
      globalForMcp.__mcpInstance = { client, transport };
      return client;
    } catch (error) {
      await transport.close().catch(() => {});
      throw error;
    } finally {
      globalForMcp.__mcpConnecting = undefined;
    }
  })();

  return globalForMcp.__mcpConnecting;
}

function createProgressOptions(onProgress?: ProgressCallback) {
  return onProgress ? { onprogress: onProgress } : undefined;
}

export async function callFetchUrl(
  args: FetchUrlArgs,
  onProgress?: ProgressCallback,
): Promise<CallToolResult> {
  const client = await getConnectedClient();

  const result = await client.callTool(
    {
      name: FETCH_URL_TOOL_NAME,
      arguments: { url: args.url },
    },
    undefined,
    createProgressOptions(onProgress),
  );

  return result as CallToolResult;
}

function getFetchUrlTransportCommand(): string {
  return path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "fetch-url-mcp.cmd" : "fetch-url-mcp",
  );
}

const METADATA_FIELDS = [
  "description",
  "author",
  "publishedDate",
  "modifiedDate",
  "image",
  "favicon",
] as const;
const HTTP_ERROR_CODE_PREFIX = "HTTP_";
const UNKNOWN_MCP_ERROR_MESSAGE = "Unknown MCP error";
const EMPTY_MCP_RESPONSE_MESSAGE = "Empty MCP response";
const INVALID_MCP_RESPONSE_MESSAGE = "Failed to parse MCP response as JSON";
const INVALID_MCP_ERROR_RESPONSE_MESSAGE = "Failed to parse MCP error response";

const KNOWN_MCP_ERRORS = {
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", retryable: false },
  FETCH_ERROR: { code: "FETCH_ERROR", retryable: true },
  ABORTED: { code: "ABORTED", retryable: true },
  queue_full: { code: "QUEUE_FULL", retryable: true },
} as const;

type JsonRecord = Record<string, unknown>;
type KnownMcpErrorCode = keyof typeof KNOWN_MCP_ERRORS;
type KnownMcpErrorDefinition = (typeof KNOWN_MCP_ERRORS)[KnownMcpErrorCode];

function isKnownMcpErrorCode(code: string): code is KnownMcpErrorCode {
  return code in KNOWN_MCP_ERRORS;
}

function readKnownMcpError(code: string): KnownMcpErrorDefinition | undefined {
  return isKnownMcpErrorCode(code) ? KNOWN_MCP_ERRORS[code] : undefined;
}

/**
 * Maps an MCP error code string to a TransformError.
 */
function mapMcpError(errorPayload: JsonRecord): TransformError {
  const code = readString(errorPayload.code) ?? "";
  const message = readString(errorPayload.message) ?? UNKNOWN_MCP_ERROR_MESSAGE;
  const knownError = readKnownMcpError(code);

  if (knownError) {
    return createTransformError(knownError.code, message, {
      retryable: knownError.retryable,
    });
  }

  return mapUnknownMcpError(code, message);
}

function mapUnknownMcpError(code: string, message: string): TransformError {
  if (!code.startsWith(HTTP_ERROR_CODE_PREFIX)) {
    return createInternalError(message);
  }

  const statusCode = readHttpStatusCode(code);
  return createTransformError("HTTP_ERROR", message, {
    retryable: statusCode !== undefined && statusCode >= 500,
    statusCode,
  });
}

function readHttpStatusCode(code: string): number | undefined {
  const statusCode = Number.parseInt(
    code.slice(HTTP_ERROR_CODE_PREFIX.length),
    10,
  );
  return Number.isNaN(statusCode) ? undefined : statusCode;
}

function extractMetadata(data: JsonRecord): TransformMetadata {
  return readOptionalStringProperties(asRecord(data.metadata), METADATA_FIELDS);
}

function mapToTransformResult(data: JsonRecord): TransformResult {
  return {
    url: readString(data.url) ?? "",
    resolvedUrl: readString(data.resolvedUrl),
    finalUrl: readString(data.finalUrl),
    title: readString(data.title),
    metadata: extractMetadata(data),
    markdown: readString(data.markdown) ?? "",
    fromCache: readBoolean(data.fromCache) ?? false,
    fetchedAt: readString(data.fetchedAt) ?? new Date().toISOString(),
    contentSize: readNumber(data.contentSize) ?? 0,
    truncated: readBoolean(data.truncated) ?? false,
  };
}

export type ParsedMcpResult =
  | { ok: true; result: TransformResult }
  | { ok: false; error: TransformError };

export function parseMcpResult(raw: CallToolResult): ParsedMcpResult {
  const payloadState = readPayloadRecord(raw);
  if (!("payload" in payloadState)) {
    return createPayloadParseFailure(raw.isError === true, payloadState.kind);
  }

  return raw.isError
    ? createErrorResult(payloadState.payload)
    : createSuccessResult(payloadState.payload);
}

type PayloadReadState =
  | { kind: "structured" | "text"; payload: JsonRecord }
  | { kind: "invalid_text" | "missing" };

function readPayloadRecord(raw: CallToolResult): PayloadReadState {
  const structuredPayload = asRecord(raw.structuredContent);
  if (structuredPayload) {
    return { kind: "structured", payload: structuredPayload };
  }

  const text = getFirstTextBlock(raw);
  if (text === null) {
    return { kind: "missing" };
  }

  const payload = parseJsonRecord(text);
  return payload ? { kind: "text", payload } : { kind: "invalid_text" };
}

function createErrorResult(payload: JsonRecord): ParsedMcpResult {
  return {
    ok: false,
    error: mapMcpError(unwrapRecord(payload, "error")),
  };
}

function createSuccessResult(payload: JsonRecord): ParsedMcpResult {
  return {
    ok: true,
    result: mapToTransformResult(unwrapRecord(payload, "result")),
  };
}

function createPayloadParseFailure(
  isError: boolean,
  kind: Extract<PayloadReadState, { kind: "invalid_text" | "missing" }>["kind"],
): ParsedMcpResult {
  if (isError) {
    return {
      ok: false,
      error: createInternalError(INVALID_MCP_ERROR_RESPONSE_MESSAGE),
    };
  }

  if (kind === "invalid_text") {
    return {
      ok: false,
      error: createInternalError(INVALID_MCP_RESPONSE_MESSAGE),
    };
  }

  return {
    ok: false,
    error: createInternalError(EMPTY_MCP_RESPONSE_MESSAGE),
  };
}

function getFirstTextBlock(raw: CallToolResult): string | null {
  const [firstContent] = raw.content;
  if (firstContent?.type !== "text") {
    return null;
  }

  return firstContent.text;
}

function unwrapRecord(record: JsonRecord, key: string): JsonRecord {
  return asRecord(record[key]) ?? record;
}

function parseJsonRecord(value: string): JsonRecord | null {
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null
    ? (value as JsonRecord)
    : null;
}

function readOptionalStringProperties<const TFields extends readonly string[]>(
  record: JsonRecord | null,
  fields: TFields,
): Partial<Record<TFields[number], string>> {
  const result: Partial<Record<TFields[number], string>> = {};

  if (!record) {
    return result;
  }

  for (const field of fields) {
    const value = readString(record[field]);
    if (value !== undefined) {
      const fieldName = field as TFields[number];
      result[fieldName] = value;
    }
  }

  return result;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
