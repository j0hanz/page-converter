import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  TransformError,
  TransformResult,
  TransformMetadata,
} from "@/lib/errors/transform";
import {
  createInternalError,
  createTransformError,
} from "@/lib/errors/transform";

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

function readKnownMcpError(code: string) {
  return KNOWN_MCP_ERRORS[code as KnownMcpErrorCode];
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
    retryable: !Number.isNaN(statusCode) && statusCode >= 500,
    statusCode: Number.isNaN(statusCode) ? undefined : statusCode,
  });
}

function readHttpStatusCode(code: string): number {
  return Number.parseInt(code.slice(HTTP_ERROR_CODE_PREFIX.length), 10);
}

function extractMetadata(data: JsonRecord): TransformMetadata {
  const metadata = asRecord(data.metadata);
  const result: TransformMetadata = {};

  if (!metadata) {
    return result;
  }

  for (const field of METADATA_FIELDS) {
    const value = readString(metadata[field]);
    if (value !== undefined) {
      result[field] = value;
    }
  }

  return result;
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
  const payload = readPayloadRecord(raw);
  if (!payload) {
    return getContentParseFailure(raw);
  }

  if (raw.isError) {
    return {
      ok: false,
      error: mapMcpError(unwrapRecord(payload, "error")),
    };
  }

  return {
    ok: true,
    result: mapToTransformResult(unwrapRecord(payload, "result")),
  };
}

function readPayloadRecord(raw: CallToolResult): JsonRecord | null {
  return asRecord(raw.structuredContent) ?? parseFirstTextRecord(raw);
}

function getContentParseFailure(raw: CallToolResult): ParsedMcpResult {
  if (raw.isError) {
    return {
      ok: false,
      error: createInternalError(INVALID_MCP_ERROR_RESPONSE_MESSAGE),
    };
  }

  if (getFirstTextBlock(raw) !== null) {
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

function parseFirstTextRecord(raw: CallToolResult): JsonRecord | null {
  const text = getFirstTextBlock(raw);
  if (text === null) {
    return null;
  }

  try {
    return asRecord(JSON.parse(text));
  } catch {
    return null;
  }
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

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null
    ? (value as JsonRecord)
    : null;
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
