export interface TransformRequest {
  url: string;
}

const URL_REQUIRED_MESSAGE =
  'Field "url" is required and must be a non-empty string.';
const TRANSFORM_REQUEST_FIELD_NAMES = new Set<keyof TransformRequest>(['url']);
const SUPPORTED_PROTOCOLS = new Set<URL['protocol']>(['http:', 'https:']);

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function readTransformRequestRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  return body as Record<string, unknown>;
}

function readUnexpectedField(
  record: Record<string, unknown>
): string | undefined {
  return Object.keys(record).find(
    (key) => !TRANSFORM_REQUEST_FIELD_NAMES.has(key as keyof TransformRequest)
  );
}

function readTransformRequestUrl(record: Record<string, unknown>): string {
  const url = record.url;
  if (typeof url !== 'string') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const trimmed = url.trim();
  if (trimmed === '') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  return trimmed;
}

export function validateTransformRequest(body: unknown): TransformRequest {
  const record = readTransformRequestRecord(body);
  const unexpectedField = readUnexpectedField(record);

  if (unexpectedField !== undefined) {
    throw new ValidationError(`Unknown field: "${unexpectedField}".`);
  }

  const trimmedUrl = readTransformRequestUrl(record);

  const parsed = URL.parse(trimmedUrl);
  if (!parsed) {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  return { url: trimmedUrl };
}
