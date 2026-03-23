import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  CallToolResult,
  Progress,
} from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

import type {
  TransformError,
  TransformMetadata,
  TransformResult,
} from '@/lib/api';
import {
  createInternalError,
  createTransformError,
  type JsonRecord,
} from '@/lib/api';

interface FetchUrlArgs {
  url: string;
}

function readPackageVersion(): string {
  const pkgPath = findPackageJSON('..', import.meta.url);
  if (!pkgPath) return '0.0.0';
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    version?: string;
  };
  return pkg.version ?? '0.0.0';
}

const CLIENT_INFO = { name: 'fetch-url', version: readPackageVersion() };
const FETCH_URL_PACKAGE_NAME = '@j0hanz/fetch-url-mcp';
const FETCH_URL_ENTRYPOINT = path.join('dist', 'index.js');
const FETCH_URL_TOOL_NAME = 'fetch-url';

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
  __mcpRuntimeState?: McpRuntimeState;
}

interface TransportConfig {
  command: string;
  args: string[];
}

interface McpRuntimeState {
  connecting?: Promise<Client>;
  instance?: McpInstance;
  lastStderr?: string;
}

const globalForMcp = globalThis as typeof globalThis & McpGlobalState;

function getMcpRuntimeState(): McpRuntimeState {
  globalForMcp.__mcpRuntimeState ??= {};
  return globalForMcp.__mcpRuntimeState;
}

function createTransport(state: McpRuntimeState): StdioClientTransport {
  const { command, args } = getFetchUrlTransportConfig();
  const transport = new StdioClientTransport({
    command,
    args,
    stderr: 'pipe',
  });

  attachTransportDiagnostics(transport, state);
  return transport;
}

async function resetRuntimeState(
  state: McpRuntimeState = getMcpRuntimeState(),
  clearDiagnostics = false
): Promise<void> {
  const { instance } = state;
  state.connecting = undefined;
  state.instance = undefined;
  if (clearDiagnostics) {
    state.lastStderr = undefined;
  }

  await instance?.transport?.close().catch(() => {});
}

export async function resetMcpRuntimeStateForTests(): Promise<void> {
  await resetRuntimeState(getMcpRuntimeState(), true);
}

function createClient(state: McpRuntimeState): Client {
  const client = new Client(CLIENT_INFO);

  client.onerror = () => {
    void resetRuntimeState(state);
  };

  client.onclose = () => {
    void resetRuntimeState(state);
  };

  return client;
}

async function getConnectedClient(): Promise<Client> {
  const state = getMcpRuntimeState();

  if (state.instance) {
    return state.instance.client;
  }

  if (state.connecting) {
    return state.connecting;
  }

  state.connecting = connectClient(state);

  return state.connecting;
}

async function connectClient(state: McpRuntimeState): Promise<Client> {
  const transport = createTransport(state);
  const client = createClient(state);

  try {
    await client.connect(transport);
    state.instance = { client, transport };
    return client;
  } catch (error) {
    await closeTransportQuietly(transport);
    throw createTransportError(error, state);
  } finally {
    state.connecting = undefined;
  }
}

async function closeTransportQuietly(
  transport: Pick<StdioClientTransport, 'close'>
): Promise<void> {
  await transport.close().catch(() => {});
}

function createRequestOptions(options?: FetchUrlCallOptions): {
  onprogress?: ProgressCallback;
  signal?: AbortSignal;
  resetTimeoutOnProgress?: boolean;
  maxTotalTimeout: number;
} {
  const result: ReturnType<typeof createRequestOptions> = {
    maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
  };
  if (options?.onProgress) {
    result.onprogress = options.onProgress;
    result.resetTimeoutOnProgress = true;
  }
  if (options?.signal) {
    result.signal = options.signal;
  }
  return result;
}

export async function callFetchUrl(
  args: FetchUrlArgs,
  options?: FetchUrlCallOptions
): Promise<CallToolResult> {
  const client = await getConnectedClient();

  try {
    const result = await client.callTool(
      {
        name: FETCH_URL_TOOL_NAME,
        arguments: { url: args.url },
      },
      undefined,
      createRequestOptions(options)
    );

    return result as CallToolResult;
  } catch (error) {
    if (shouldResetInstance(error)) {
      await resetRuntimeState();
    }
    throw createTransportError(error, getMcpRuntimeState());
  }
}

function shouldResetInstance(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
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

function readFetchUrlPackageSearchBase(
  currentWorkingDirectory?: string
): string {
  return currentWorkingDirectory
    ? path.resolve(currentWorkingDirectory, 'package.json')
    : import.meta.url;
}

export function resolveFetchUrlPackageRoot(
  currentWorkingDirectory?: string
): string {
  const packageJsonPath = findPackageJSON(
    FETCH_URL_PACKAGE_NAME,
    readFetchUrlPackageSearchBase(currentWorkingDirectory)
  );

  if (!packageJsonPath) {
    throw new Error(`Unable to locate ${FETCH_URL_PACKAGE_NAME}.`);
  }

  return path.dirname(packageJsonPath);
}

export function getFetchUrlTransportConfig(
  currentWorkingDirectory?: string
): TransportConfig {
  const packageRoot = resolveFetchUrlPackageRoot(currentWorkingDirectory);

  return {
    command: process.execPath,
    args: [path.join(packageRoot, FETCH_URL_ENTRYPOINT)],
  };
}

const MAX_STDERR_BUFFER_LENGTH = 4000;
const MCP_MAX_TOTAL_TIMEOUT = 120_000;
const HTTP_ERROR_CODE_PREFIX = 'HTTP_';

const KNOWN_MCP_ERRORS = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', retryable: false },
  FETCH_ERROR: { code: 'FETCH_ERROR', retryable: true },
  ABORTED: { code: 'ABORTED', retryable: true },
  queue_full: { code: 'QUEUE_FULL', retryable: true },
} as const;

function attachTransportDiagnostics(
  transport: StdioClientTransport,
  state: McpRuntimeState
): void {
  state.lastStderr = undefined;

  transport.stderr?.on('data', (chunk: string | Buffer) => {
    state.lastStderr = appendStderrChunk(state, String(chunk));
  });
}

function appendStderrChunk(state: McpRuntimeState, chunk: string): string {
  const stderr = `${state.lastStderr ?? ''}${chunk}`;
  return stderr.slice(-MAX_STDERR_BUFFER_LENGTH);
}

function createTransportError(error: unknown, state: McpRuntimeState): Error {
  const message = error instanceof Error ? error.message : String(error);
  const stderr = state.lastStderr?.trim();

  if (!stderr) {
    return error instanceof Error ? error : new Error(message);
  }

  const transportErrorMessage = `${message}\nChild stderr: ${stderr}`;
  if (error instanceof McpError) {
    const transportError = new McpError(
      error.code,
      transportErrorMessage,
      error.data
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
  const code = readString(errorPayload.code) ?? '';
  const message =
    readFirstString(errorPayload.message, errorPayload.error) ??
    'Unknown MCP error';
  const knownError = readKnownMcpError(code);
  const statusCode = readInteger(errorPayload.statusCode);
  const details = readErrorDetails(errorPayload);

  if (knownError) {
    return createTransformError(knownError.code, message, {
      retryable: knownError.retryable,
      statusCode,
      details,
    });
  }

  return mapUnknownMcpError(code, message, statusCode, details);
}

function mapUnknownMcpError(
  code: string,
  message: string,
  statusCode?: number,
  details?: TransformError['details']
): TransformError {
  if (!code.startsWith(HTTP_ERROR_CODE_PREFIX)) {
    return createTransformError('INTERNAL_ERROR', message, {
      statusCode,
      details,
    });
  }

  const resolvedStatusCode = statusCode ?? readHttpStatusCode(code);
  return createTransformError('HTTP_ERROR', message, {
    retryable: resolvedStatusCode !== undefined && resolvedStatusCode >= 500,
    statusCode: resolvedStatusCode,
    details,
  });
}

function readHttpStatusCode(code: string): number | undefined {
  const statusCode = Number.parseInt(
    code.slice(HTTP_ERROR_CODE_PREFIX.length),
    10
  );
  return Number.isNaN(statusCode) ? undefined : statusCode;
}

function extractMetadata(data: JsonRecord): TransformMetadata {
  const metadata = asRecord(data.metadata);
  if (!metadata) {
    return {};
  }

  return omitUndefinedFields({
    description: readString(metadata.description),
    author: readString(metadata.author),
    publishedAt: readFirstString(metadata.publishedAt, metadata.publishedDate),
    modifiedAt: readFirstString(metadata.modifiedAt, metadata.modifiedDate),
    image: readString(metadata.image),
    favicon: readString(metadata.favicon),
  }) as TransformMetadata;
}

function mapToTransformResult(data: JsonRecord): TransformResult {
  return {
    url: readFirstString(data.url, data.inputUrl) ?? '',
    resolvedUrl: readString(data.resolvedUrl),
    finalUrl: readString(data.finalUrl),
    title: readString(data.title),
    metadata: extractMetadata(data),
    markdown: readString(data.markdown) ?? '',
    fromCache: readBoolean(data.fromCache) ?? false,
    fetchedAt: readString(data.fetchedAt) ?? new Date().toISOString(),
    contentSize: readNumber(data.contentSize) ?? 0,
    truncated: readBoolean(data.truncated) ?? false,
  };
}

type ParsedMcpResult =
  | { ok: true; result: TransformResult }
  | { ok: false; error: TransformError };

export function parseMcpResult(raw: CallToolResult): ParsedMcpResult {
  const payloadState = readPayloadRecord(raw);
  if (!('payload' in payloadState)) {
    return createPayloadParseFailure(raw.isError === true, payloadState.kind);
  }

  return raw.isError
    ? createErrorResult(payloadState.payload)
    : createSuccessResult(payloadState.payload);
}

type PayloadReadState =
  | { kind: 'structured' | 'text'; payload: JsonRecord }
  | { kind: 'invalid_text' | 'missing' };

function readPayloadRecord(raw: CallToolResult): PayloadReadState {
  const structuredPayload = asRecord(raw.structuredContent);
  if (structuredPayload) {
    return { kind: 'structured', payload: structuredPayload };
  }

  const text = getFirstTextBlock(raw);
  if (text === null) {
    return { kind: 'missing' };
  }

  const payload = parseJsonRecord(text);
  return payload ? { kind: 'text', payload } : { kind: 'invalid_text' };
}

function createErrorResult(payload: JsonRecord): ParsedMcpResult {
  return {
    ok: false,
    error: mapMcpError(unwrapRecord(payload, 'error')),
  };
}

function createSuccessResult(payload: JsonRecord): ParsedMcpResult {
  return {
    ok: true,
    result: mapToTransformResult(unwrapRecord(payload, 'result')),
  };
}

function createPayloadParseFailure(
  isError: boolean,
  kind: Extract<PayloadReadState, { kind: 'invalid_text' | 'missing' }>['kind']
): ParsedMcpResult {
  if (isError) {
    return {
      ok: false,
      error: createInternalError('Failed to parse MCP error response'),
    };
  }

  if (kind === 'invalid_text') {
    return {
      ok: false,
      error: createInternalError('Failed to parse MCP response as JSON'),
    };
  }

  return {
    ok: false,
    error: createInternalError('Empty MCP response'),
  };
}

function getFirstTextBlock(raw: CallToolResult): string | null {
  const [firstContent] = raw.content;
  if (firstContent?.type !== 'text') {
    return null;
  }

  return firstContent.text;
}

function unwrapRecord(record: JsonRecord, key: string): JsonRecord {
  return asRecord(record[key]) ?? record;
}

function readErrorDetails(
  errorPayload: JsonRecord
): TransformError['details'] | undefined {
  const details = asRecord(errorPayload.details);
  if (!details) {
    return undefined;
  }

  const retryAfter = details.retryAfter;
  const timeout = readInteger(details.timeout);
  const reason = readString(details.reason);
  const mappedDetails = omitUndefinedFields({
    retryAfter:
      typeof retryAfter === 'number' ||
      typeof retryAfter === 'string' ||
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
  return typeof value === 'object' && value !== null
    ? (value as JsonRecord)
    : null;
}

function omitUndefinedFields<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
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
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readInteger(value: unknown): number | undefined {
  const number = readNumber(value);
  return number !== undefined && Number.isInteger(number) ? number : undefined;
}
