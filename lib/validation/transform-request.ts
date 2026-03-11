export interface TransformRequest {
  url: string;
  skipNoiseRemoval?: boolean;
  forceRefresh?: boolean;
  maxInlineChars?: number;
}

const ALLOWED_FIELDS = new Set<keyof TransformRequest>([
  "url",
  "skipNoiseRemoval",
  "forceRefresh",
  "maxInlineChars",
]);
const BOOLEAN_FIELDS = ["skipNoiseRemoval", "forceRefresh"] as const;

type TransformRequestRecord = Record<string, unknown>;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateTransformRequest(body: unknown): TransformRequest {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const record = body as TransformRequestRecord;

  // Reject unknown fields
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key as keyof TransformRequest)) {
      throw new ValidationError(`Unknown field: "${key}".`);
    }
  }

  // Validate url
  const url = validateUrl(record.url);

  // Validate optional booleans
  for (const field of BOOLEAN_FIELDS) {
    validateOptionalBoolean(record, field);
  }

  const maxInlineChars = validateMaxInlineChars(record.maxInlineChars);

  const request: TransformRequest = { url };
  assignOptionalField(
    request,
    "skipNoiseRemoval",
    record.skipNoiseRemoval as boolean | undefined,
  );
  assignOptionalField(
    request,
    "forceRefresh",
    record.forceRefresh as boolean | undefined,
  );
  assignOptionalField(request, "maxInlineChars", maxInlineChars);

  return request;
}

function validateUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(
      'Field "url" is required and must be a non-empty string.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  return value;
}

function validateOptionalBoolean(
  record: TransformRequestRecord,
  field: (typeof BOOLEAN_FIELDS)[number],
): void {
  if (record[field] !== undefined && typeof record[field] !== "boolean") {
    throw new ValidationError(`Field "${field}" must be a boolean.`);
  }
}

function validateMaxInlineChars(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      'Field "maxInlineChars" must be a non-negative integer.',
    );
  }

  return value;
}

function assignOptionalField<K extends keyof TransformRequest>(
  request: TransformRequest,
  key: K,
  value: TransformRequest[K] | undefined,
): void {
  if (value !== undefined) {
    request[key] = value;
  }
}
