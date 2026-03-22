export interface TransformRequest {
  url: string;
}

const URL_REQUIRED_MESSAGE =
  'Field "url" is required and must be a non-empty string.';
const SUPPORTED_PROTOCOLS = new Set<URL['protocol']>(['http:', 'https:']);

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function parseUrlString(value: string): URL | null {
  return URL.parse(value);
}

function readTransformRequestRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  return body as Record<string, unknown>;
}

export function validateTransformRequest(body: unknown): TransformRequest {
  const record = readTransformRequestRecord(body);
  const unexpectedField = Object.keys(record).find((key) => key !== 'url');

  if (unexpectedField !== undefined) {
    throw new ValidationError(`Unknown field: "${unexpectedField}".`);
  }

  const { url } = record;

  if (typeof url !== 'string') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const trimmed = url.trim();
  if (trimmed === '') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const parsed = parseUrlString(trimmed);
  if (!parsed) {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  return { url: trimmed };
}
