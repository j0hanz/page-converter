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

type JsonRecord = Record<string, unknown>;

/**
 * Maps an MCP error code string to a TransformError.
 */
function mapMcpError(errorPayload: JsonRecord): TransformError {
  const code = readString(errorPayload.code) ?? "";
  const message = readString(errorPayload.message) ?? "Unknown MCP error";

  switch (code) {
    case "VALIDATION_ERROR":
      return createTransformError("VALIDATION_ERROR", message, {
        retryable: false,
      });
    case "FETCH_ERROR":
      return createTransformError("FETCH_ERROR", message, { retryable: true });
    case "ABORTED":
      return createTransformError("ABORTED", message, { retryable: true });
    case "queue_full":
      return createTransformError("QUEUE_FULL", message, { retryable: true });
    default:
      return mapUnknownMcpError(code, message);
  }
}

function mapUnknownMcpError(code: string, message: string): TransformError {
  if (!code.startsWith(HTTP_ERROR_CODE_PREFIX)) {
    return createInternalError(message);
  }

  const statusCode = Number.parseInt(
    code.slice(HTTP_ERROR_CODE_PREFIX.length),
    10,
  );
  return createTransformError("HTTP_ERROR", message, {
    retryable: !Number.isNaN(statusCode) && statusCode >= 500,
    statusCode: Number.isNaN(statusCode) ? undefined : statusCode,
  });
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
  if (raw.isError) {
    return parseErrorResult(raw);
  }

  const payload = readPayloadRecord(raw);
  if (payload) {
    return {
      ok: true,
      result: mapToTransformResult(unwrapRecord(payload, "result")),
    };
  }

  return getContentParseFailure(raw);
}

function parseErrorResult(raw: CallToolResult): ParsedMcpResult {
  const payload = readPayloadRecord(raw);
  if (!payload) {
    return {
      ok: false,
      error: createInternalError("Failed to parse MCP error response"),
    };
  }

  return {
    ok: false,
    error: mapMcpError(unwrapRecord(payload, "error")),
  };
}

function readPayloadRecord(raw: CallToolResult): JsonRecord | null {
  return asRecord(raw.structuredContent) ?? parseFirstTextRecord(raw);
}

function getContentParseFailure(raw: CallToolResult): ParsedMcpResult {
  if (getFirstTextBlock(raw) !== null) {
    return {
      ok: false,
      error: createInternalError("Failed to parse MCP response as JSON"),
    };
  }

  return {
    ok: false,
    error: createInternalError("Empty MCP response"),
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
