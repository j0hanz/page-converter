export interface TransformRequest {
  url: string;
}

const BODY_MUST_BE_OBJECT_MESSAGE = "Request body must be a JSON object.";
const URL_REQUIRED_MESSAGE =
  'Field "url" is required and must be a non-empty string.';
const URL_INVALID_MESSAGE = 'Field "url" must be a valid URL.';
const URL_PROTOCOL_MESSAGE = 'Field "url" must use http: or https: scheme.';
const SUPPORTED_PROTOCOLS = new Set<URL["protocol"]>(["http:", "https:"]);

type TransformRequestRecord = Record<string, unknown>;
type TransformRequestField = keyof TransformRequest;
type TransformRequestParserMap = {
  [K in TransformRequestField]: (value: unknown) => TransformRequest[K];
};

const TRANSFORM_REQUEST_PARSERS = {
  url: parseValidatedUrl,
} satisfies TransformRequestParserMap;
const ALLOWED_FIELDS = new Set<TransformRequestField>(
  Object.keys(TRANSFORM_REQUEST_PARSERS) as TransformRequestField[],
);

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateTransformRequest(body: unknown): TransformRequest {
  const record = requireTransformRequestRecord(body);
  assertAllowedFields(record);

  return parseTransformRequestRecord(record);
}

function parseTransformRequestRecord(
  record: TransformRequestRecord,
): TransformRequest {
  return {
    url: TRANSFORM_REQUEST_PARSERS.url(record.url),
  };
}

function requireTransformRequestRecord(body: unknown): TransformRequestRecord {
  if (!isRecordObject(body)) {
    throw new ValidationError(BODY_MUST_BE_OBJECT_MESSAGE);
  }

  return body;
}

function assertAllowedFields(record: TransformRequestRecord): void {
  const unexpectedField = Object.keys(record).find(
    (key) => !isAllowedField(key),
  );
  if (unexpectedField !== undefined) {
    throw new ValidationError(`Unknown field: "${unexpectedField}".`);
  }
}

function isAllowedField(key: string): key is TransformRequestField {
  return ALLOWED_FIELDS.has(key as TransformRequestField);
}

function parseValidatedUrl(value: unknown): string {
  const trimmed = readRequiredTrimmedString(value);
  assertSupportedProtocol(parseUrl(trimmed).protocol);

  return trimmed;
}

function readRequiredTrimmedString(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  return trimmed;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new ValidationError(URL_INVALID_MESSAGE);
  }
}

function isRecordObject(value: unknown): value is TransformRequestRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertSupportedProtocol(protocol: URL["protocol"]): void {
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw new ValidationError(URL_PROTOCOL_MESSAGE);
  }
}
