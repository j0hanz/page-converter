export interface TransformRequest {
  url: string;
}

const BODY_MUST_BE_OBJECT_MESSAGE = "Request body must be a JSON object.";
const URL_REQUIRED_MESSAGE =
  'Field "url" is required and must be a non-empty string.';
const URL_INVALID_MESSAGE = 'Field "url" must be a valid URL.';
const URL_PROTOCOL_MESSAGE = 'Field "url" must use http: or https: scheme.';
const ALLOWED_FIELDS = new Set<keyof TransformRequest>(["url"]);
const SUPPORTED_PROTOCOLS = new Set<URL["protocol"]>(["http:", "https:"]);

type TransformRequestRecord = Record<string, unknown>;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateTransformRequest(body: unknown): TransformRequest {
  const record = asTransformRequestRecord(body);
  validateAllowedFields(record);
  const url = validateUrl(record.url);

  return { url };
}

function asTransformRequestRecord(body: unknown): TransformRequestRecord {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError(BODY_MUST_BE_OBJECT_MESSAGE);
  }

  return body as TransformRequestRecord;
}

function validateAllowedFields(record: TransformRequestRecord): void {
  for (const key of Object.keys(record)) {
    assertAllowedField(key);
  }
}

function assertAllowedField(key: string): void {
  if (!ALLOWED_FIELDS.has(key as keyof TransformRequest)) {
    throw new ValidationError(`Unknown field: "${key}".`);
  }
}

function validateUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const trimmed = value.trim();
  assertSupportedProtocol(parseUrl(trimmed).protocol);

  return trimmed;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new ValidationError(URL_INVALID_MESSAGE);
  }
}

function assertSupportedProtocol(protocol: URL["protocol"]): void {
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw new ValidationError(URL_PROTOCOL_MESSAGE);
  }
}
