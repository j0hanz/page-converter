export interface TransformRequest {
  url: string;
}

const ALLOWED_FIELDS = new Set<keyof TransformRequest>(["url"]);
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

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
    throw new ValidationError("Request body must be a JSON object.");
  }

  return body as TransformRequestRecord;
}

function validateAllowedFields(record: TransformRequestRecord): void {
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key as keyof TransformRequest)) {
      throw new ValidationError(`Unknown field: "${key}".`);
    }
  }
}

function validateUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(
      'Field "url" is required and must be a non-empty string.',
    );
  }

  const trimmed = value.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  return trimmed;
}
