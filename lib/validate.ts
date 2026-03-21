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

export function validateTransformRequest(body: unknown): TransformRequest {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const unexpectedField = Object.keys(record).find((key) => key !== 'url');
  if (unexpectedField !== undefined) {
    throw new ValidationError(`Unknown field: "${unexpectedField}".`);
  }

  return { url: parseValidatedUrl(record.url) };
}

function parseValidatedUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    throw new ValidationError(URL_REQUIRED_MESSAGE);
  }

  assertSupportedProtocol(parseUrl(trimmed).protocol);
  return trimmed;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new ValidationError('Field "url" must be a valid URL.');
  }
}

function assertSupportedProtocol(protocol: URL['protocol']): void {
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }
}
