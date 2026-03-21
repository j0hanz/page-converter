import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  CallToolResult,
  Progress,
} from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
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

export type ProgressCallback = (progress: Progress) => void;

interface FetchUrlCallOptions {
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

interface McpInstance {
  client: Client;
  transport: StdioClientTransport;
}

interface McpGlobalState {
  __mcpInstance?: McpInstance;
  __mcpConnecting?: Promise<Client>;
  __mcpLastStderr?: string;
}

interface TransportConfig {
  command: string;
  args: string[];
}

const globalForMcp = globalThis as typeof globalThis & McpGlobalState;

function createTransport(): StdioClientTransport {
  const { command, args } = getFetchUrlTransportConfig();
  const transport = new StdioClientTransport({
    command,
    args,
    stderr: "pipe",
  });

  attachTransportDiagnostics(transport);
  return transport;
}

function resetInstance() {
  const instance = globalForMcp.__mcpInstance;
  globalForMcp.__mcpInstance = undefined;

  if (instance) {
    instance.transport.close().catch(() => {});
  }
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
      throw createTransportError(error);
    } finally {
      globalForMcp.__mcpConnecting = undefined;
    }
  })();

  return globalForMcp.__mcpConnecting;
}

function createRequestOptions(options?: FetchUrlCallOptions): {
  onprogress?: ProgressCallback;
  signal?: AbortSignal;
  resetTimeoutOnProgress?: boolean;
  maxTotalTimeout: number;
} {
  return {
    maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
    ...(options?.onProgress
      ? { onprogress: options.onProgress, resetTimeoutOnProgress: true }
      : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  };
}

export async function callFetchUrl(
  args: FetchUrlArgs,
  options?: FetchUrlCallOptions,
): Promise<CallToolResult> {
  const client = await getConnectedClient();

  try {
    const result = await client.callTool(
      {
        name: FETCH_URL_TOOL_NAME,
        arguments: { url: args.url },
      },
      undefined,
      createRequestOptions(options),
    );

    return result as CallToolResult;
  } catch (error) {
    if (shouldResetInstance(error)) {
      resetInstance();
    }
    throw createTransportError(error);
  }
}

function shouldResetInstance(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") {
    return false;
  }

  if (error instanceof McpError) {
    // Only reset for transport/connection level errors.
    // InvalidParams, MethodNotFound, RequestTimeout etc. do not mean the transport is dead.
    return (
      error.code === (ErrorCode.ConnectionClosed as number) ||
      error.code === (ErrorCode.InternalError as number)
    );
  }

  return true;
}

export function getFetchUrlTransportConfig(
  currentWorkingDirectory: string = process.cwd(),
): TransportConfig {
  return {
    command: process.execPath,
    args: [
      path.join(
        currentWorkingDirectory,
        "node_modules",
        "@j0hanz",
        "fetch-url-mcp",
        "dist",
        "index.js",
      ),
    ],
  };
}

const MAX_STDERR_BUFFER_LENGTH = 4000;
const MCP_MAX_TOTAL_TIMEOUT = 120_000;
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

function attachTransportDiagnostics(transport: StdioClientTransport): void {
  globalForMcp.__mcpLastStderr = undefined;

  transport.stderr?.on("data", (chunk: string | Buffer) => {
    globalForMcp.__mcpLastStderr = appendStderrChunk(String(chunk));
  });
}

function appendStderrChunk(chunk: string): string {
  const stderr = `${globalForMcp.__mcpLastStderr ?? ""}${chunk}`;
  return stderr.slice(-MAX_STDERR_BUFFER_LENGTH);
}

function createTransportError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const stderr = globalForMcp.__mcpLastStderr?.trim();

  if (!stderr) {
    return error instanceof Error ? error : new Error(message);
  }

  const transportErrorMessage = `${message}\nChild stderr: ${stderr}`;
  if (error instanceof McpError) {
    const transportError = new McpError(
      error.code,
      transportErrorMessage,
      error.data,
    );
    if (error.stack) {
      transportError.stack = error.stack;
    }

    return transportError;
  }

  const transportError = new Error(transportErrorMessage);
  if (error instanceof Error && error.stack) {
    transportError.stack = error.stack;
  }

  return transportError;
}

type JsonRecord = Record<string, unknown>;
type KnownMcpErrorCode = keyof typeof KNOWN_MCP_ERRORS;
type KnownMcpErrorDefinition = (typeof KNOWN_MCP_ERRORS)[KnownMcpErrorCode];

function createOptionalErrorFields(
  statusCode?: number,
  details?: TransformError["details"],
): Partial<Pick<TransformError, "details" | "statusCode">> {
  return {
    ...(statusCode !== undefined ? { statusCode } : {}),
    ...(details ? { details } : {}),
  };
}

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
  const message = readMcpErrorMessage(errorPayload);
  const knownError = readKnownMcpError(code);
  const statusCode = readInteger(errorPayload.statusCode);
  const details = readErrorDetails(errorPayload);
  const optionalFields = createOptionalErrorFields(statusCode, details);

  if (knownError) {
    return createTransformError(knownError.code, message, {
      retryable: knownError.retryable,
      ...optionalFields,
    });
  }

  return mapUnknownMcpError(code, message, statusCode, details);
}

function mapUnknownMcpError(
  code: string,
  message: string,
  statusCode?: number,
  details?: TransformError["details"],
): TransformError {
  const optionalFields = createOptionalErrorFields(statusCode, details);
  if (!code.startsWith(HTTP_ERROR_CODE_PREFIX)) {
    return createTransformError("INTERNAL_ERROR", message, {
      ...optionalFields,
    });
  }

  const resolvedStatusCode = statusCode ?? readHttpStatusCode(code);
  return createTransformError("HTTP_ERROR", message, {
    retryable: resolvedStatusCode !== undefined && resolvedStatusCode >= 500,
    ...createOptionalErrorFields(resolvedStatusCode, details),
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
  const metadata = asRecord(data.metadata);
  if (!metadata) {
    return {};
  }

  return compactMetadata({
    description: readString(metadata.description),
    author: readString(metadata.author),
    publishedAt: readFirstString(metadata.publishedAt, metadata.publishedDate),
    modifiedAt: readFirstString(metadata.modifiedAt, metadata.modifiedDate),
    image: readString(metadata.image),
    favicon: readString(metadata.favicon),
  });
}

function mapToTransformResult(data: JsonRecord): TransformResult {
  return {
    url: readFirstString(data.url, data.inputUrl) ?? "",
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

function readMcpErrorMessage(errorPayload: JsonRecord): string {
  return (
    readFirstString(errorPayload.message, errorPayload.error) ??
    UNKNOWN_MCP_ERROR_MESSAGE
  );
}

function readErrorDetails(
  errorPayload: JsonRecord,
): TransformError["details"] | undefined {
  const details = asRecord(errorPayload.details);
  if (!details) {
    return undefined;
  }

  const retryAfter = details.retryAfter;
  const timeout = readInteger(details.timeout);
  const reason = readString(details.reason);
  const mappedDetails = omitUndefinedFields({
    retryAfter:
      typeof retryAfter === "number" ||
      typeof retryAfter === "string" ||
      retryAfter === null
        ? retryAfter
        : undefined,
    timeout,
    reason,
  });

  return Object.keys(mappedDetails).length > 0 ? mappedDetails : undefined;
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

function compactMetadata(metadata: TransformMetadata): TransformMetadata {
  return omitUndefinedFields(metadata) as TransformMetadata;
}

function omitUndefinedFields<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

function readFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = readString(value);
    if (stringValue !== undefined) {
      return stringValue;
    }
  }

  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readInteger(value: unknown): number | undefined {
  const number = readNumber(value);
  return number !== undefined && Number.isInteger(number) ? number : undefined;
}
