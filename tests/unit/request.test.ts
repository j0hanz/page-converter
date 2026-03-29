import { beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from '@/proxy';

import { POST } from '@/app/api/transform/route';

import type { TransformResponse } from '@/lib/api';
import { transformUrl } from '@/lib/transform';
import { validateTransformRequest, ValidationError } from '@/lib/validate';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});

vi.mock('@/lib/transform', () => ({
  transformUrl: vi.fn(),
}));

const UNKNOWN_FIELDS = [
  { extra: true },
  { skipNoiseRemoval: true },
  { forceRefresh: true },
  { maxInlineChars: 100 },
] as const;
const INVALID_BODIES = [null, [], 'string'] as const;
const VALID_URL = 'https://example.com';
const transformUrlMock = vi.mocked(transformUrl);
const SUCCESS_RESPONSE: TransformResponse = {
  ok: true,
  result: {
    url: VALID_URL,
    metadata: {},
    markdown: '# Example',
    fetchedAt: '2026-03-11T00:00:00.000Z',
    contentSize: 9,
    truncated: false,
  },
};
const IMMEDIATE_ERROR_RESPONSE: TransformResponse = {
  ok: false,
  error: {
    code: 'FETCH_ERROR',
    message: 'Upstream unavailable',
    retryable: true,
  },
};

function expectValidationError(body: unknown, matcher?: RegExp): void {
  expect(() => validateTransformRequest(body)).toThrow(ValidationError);

  if (matcher) {
    expect(() => validateTransformRequest(body)).toThrow(matcher);
  }
}

function createJsonRequest(body: string): Request {
  return new Request('http://localhost/api/transform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function createAbortableJsonRequest(
  body: string,
  signal: AbortSignal,
  headers: HeadersInit = { 'Content-Type': 'application/json' }
): Request {
  return new Request('http://localhost/api/transform', {
    method: 'POST',
    headers,
    body,
    signal,
  });
}

function parseNdjsonLine(line: string): unknown {
  return JSON.parse(line);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('validateTransformRequest', () => {
  it('accepts a valid request with only url', () => {
    const result = validateTransformRequest({ url: VALID_URL });
    expect(result).toEqual({ url: VALID_URL });
  });

  it('trims whitespace from url', () => {
    const result = validateTransformRequest({
      url: '  https://example.com  ',
    });
    expect(result).toEqual({ url: 'https://example.com' });
  });

  it('rejects empty url', () => {
    expectValidationError({ url: '' });
  });

  it('rejects missing url', () => {
    expectValidationError({});
  });

  it('rejects non-http url scheme', () => {
    expectValidationError({ url: 'ftp://example.com' });
    expectValidationError({ url: 'file:///etc/passwd' });
  });

  it('rejects invalid url', () => {
    expectValidationError({ url: 'not-a-url' });
  });

  it.each(UNKNOWN_FIELDS)('rejects unknown fields: %j', (field) => {
    expectValidationError(
      {
        url: VALID_URL,
        ...field,
      },
      /Unknown field/
    );
  });

  it.each(INVALID_BODIES)('rejects invalid body: %j', (body) => {
    expectValidationError(body);
  });
});

describe('POST /api/transform', () => {
  it('returns a validation error for invalid JSON payloads', async () => {
    const response = await POST(createJsonRequest('not json'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON body.',
        retryable: false,
      },
    });
  });

  it('returns a validation error when the request body is too large', async () => {
    const response = await POST(
      createAbortableJsonRequest(
        JSON.stringify({ url: VALID_URL }),
        new AbortController().signal,
        {
          'Content-Type': 'application/json',
          'Content-Length': '4097',
        }
      )
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request.',
        retryable: false,
      },
    });
  });

  it('streams progress and the final result as NDJSON', async () => {
    transformUrlMock.mockImplementation((_request, onProgress) => {
      onProgress?.({
        progress: 2,
        total: 8,
        message: 'Fetching page',
      });
      return Promise.resolve(SUCCESS_RESPONSE);
    });

    const response = await POST(
      createJsonRequest(JSON.stringify({ url: VALID_URL }))
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');
    expect(transformUrlMock).toHaveBeenCalledWith(
      { url: VALID_URL },
      expect.any(Function),
      expect.any(AbortSignal)
    );

    const lines = (await response.text())
      .trim()
      .split('\n')
      .map(parseNdjsonLine);

    expect(lines).toEqual([
      {
        type: 'progress',
        progress: 2,
        total: 8,
        message: 'Fetching page',
      },
      {
        type: 'result',
        ...SUCCESS_RESPONSE,
      },
    ]);
  });

  it('returns a JSON error response when transform fails before streaming starts', async () => {
    transformUrlMock.mockResolvedValue(IMMEDIATE_ERROR_RESPONSE);

    const response = await POST(
      createJsonRequest(JSON.stringify({ url: VALID_URL }))
    );

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual(IMMEDIATE_ERROR_RESPONSE);
  });

  it('keeps using NDJSON once progress has started, even for final errors', async () => {
    transformUrlMock.mockImplementation((_request, onProgress) => {
      onProgress?.({
        progress: 1,
        total: 8,
        message: 'Starting',
      });
      return Promise.resolve(IMMEDIATE_ERROR_RESPONSE);
    });

    const response = await POST(
      createJsonRequest(JSON.stringify({ url: VALID_URL }))
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');

    const lines = (await response.text())
      .trim()
      .split('\n')
      .map(parseNdjsonLine);

    expect(lines).toEqual([
      {
        type: 'progress',
        progress: 1,
        total: 8,
        message: 'Starting',
      },
      {
        type: 'result',
        ...IMMEDIATE_ERROR_RESPONSE,
      },
    ]);
  });

  it('closes the stream when the client aborts after progress starts', async () => {
    const abortController = new AbortController();
    let resolveTransform!: (response: TransformResponse) => void;

    transformUrlMock.mockImplementation((_request, onProgress, signal) => {
      onProgress?.({
        progress: 1,
        total: 8,
        message: 'Starting',
      });

      signal?.addEventListener(
        'abort',
        () => {
          resolveTransform(SUCCESS_RESPONSE);
        },
        { once: true }
      );

      return new Promise<TransformResponse>((resolve) => {
        resolveTransform = resolve;
      });
    });

    const response = await POST(
      createAbortableJsonRequest(
        JSON.stringify({ url: VALID_URL }),
        abortController.signal
      )
    );

    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');

    abortController.abort();

    const lines = (await response.text())
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(parseNdjsonLine);

    expect(lines).toEqual([
      {
        type: 'progress',
        progress: 1,
        total: 8,
        message: 'Starting',
      },
    ]);
  });
});

describe('proxy', () => {
  it('adds the configured security headers without blocking the request', () => {
    const response = proxy({
      headers: new Headers(),
      method: 'GET',
      nextUrl: new URL('http://localhost/api/transform'),
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
    expect(response.headers.get('Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=()'
    );
    expect(response.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });
});
