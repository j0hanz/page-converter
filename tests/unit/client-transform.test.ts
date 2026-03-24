import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

const VALID_URL = 'https://example.com';

describe('client-transform', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('submits a trimmed request body to the transform endpoint', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL',
            retryable: false,
          },
        }),
    });

    await submitTransformRequest(
      `  ${VALID_URL}  `,
      { onError, onProgress: vi.fn(), onResult: vi.fn() },
      new AbortController().signal
    );

    const [requestUrl, requestInit] =
      vi.mocked(global.fetch).mock.calls[0] ?? [];

    expect(requestUrl).toBe('/api/transform');
    expect(requestInit).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: VALID_URL }),
    });
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });

  it('forwards streamed progress and final result events', async () => {
    const onProgress = vi.fn();
    const onResult = vi.fn();
    global.fetch = vi.fn().mockResolvedValue(
      createMockStreamResponse([
        { type: 'progress', progress: 1, total: 8, message: 'Fetching' },
        {
          type: 'result',
          ok: true,
          result: {
            url: VALID_URL,
            markdown: '# Example',
            metadata: {},
            fromCache: false,
            fetchedAt: '2026-03-20T00:00:00.000Z',
            contentSize: 9,
            truncated: false,
          },
        },
      ])
    );

    await submitTransformRequest(
      VALID_URL,
      { onError: vi.fn(), onProgress, onResult },
      new AbortController().signal
    );

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'progress', progress: 1 })
    );
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ url: VALID_URL, markdown: '# Example' })
    );
  });

  it('reports truncated streams as unexpected responses', async () => {
    const onError = vi.fn();
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        createMockStreamResponse([
          { type: 'progress', progress: 1, total: 8, message: 'Fetching' },
        ])
      );

    await submitTransformRequest(
      VALID_URL,
      { onError, onProgress: vi.fn(), onResult: vi.fn() },
      new AbortController().signal
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected response format.',
      })
    );
  });

  it('reports malformed stream events as unexpected responses', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue(
      createMockStreamResponse([
        {
          type: 'result',
          ok: true,
          result: {
            url: VALID_URL,
          },
        },
      ])
    );

    await submitTransformRequest(
      VALID_URL,
      { onError, onProgress: vi.fn(), onResult: vi.fn() },
      new AbortController().signal
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected response format.',
      })
    );
  });

  it('reports malformed JSON error responses as unexpected responses', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await submitTransformRequest(
      VALID_URL,
      { onError, onProgress: vi.fn(), onResult: vi.fn() },
      new AbortController().signal
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected response format.',
      })
    );
  });

  it('reports empty JSON error responses as unexpected responses', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(null),
    });

    await submitTransformRequest(
      VALID_URL,
      { onError, onProgress: vi.fn(), onResult: vi.fn() },
      new AbortController().signal
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected response format.',
      })
    );
  });

  it('skips malformed NDJSON lines and continues streaming', async () => {
    const onProgress = vi.fn();
    const onResult = vi.fn();
    const onError = vi.fn();

    const validProgress = JSON.stringify({
      type: 'progress',
      progress: 1,
      total: 8,
      message: 'Fetching',
    });
    const malformedLine = '{not valid json';
    const validResult = JSON.stringify({
      type: 'result',
      ok: true,
      result: {
        url: VALID_URL,
        markdown: '# OK',
        metadata: {},
        fromCache: false,
        fetchedAt: '2026-03-20T00:00:00.000Z',
        contentSize: 4,
        truncated: false,
      },
    });

    const raw = [validProgress, malformedLine, validResult]
      .map((l) => l + '\n')
      .join('');
    const encoded = new TextEncoder().encode(raw);

    global.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'Content-Type': 'application/x-ndjson' }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoded);
          controller.close();
        },
      }),
    });

    await submitTransformRequest(
      VALID_URL,
      { onError, onProgress, onResult },
      new AbortController().signal
    );

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'progress', progress: 1 })
    );
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ url: VALID_URL, markdown: '# OK' })
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('maps abort errors to non-retryable abort responses', () => {
    expect(
      mapClientTransformError(new DOMException('Aborted', 'AbortError'))
    ).toEqual(
      expect.objectContaining({
        code: 'ABORTED',
        message: 'Request was cancelled.',
        retryable: false,
      })
    );
  });

  it('maps timeout errors to retryable abort responses', () => {
    expect(
      mapClientTransformError(new DOMException('Timed out', 'TimeoutError'))
    ).toEqual(
      expect.objectContaining({
        code: 'ABORTED',
        retryable: true,
      })
    );
  });

  it('maps generic failures to network errors', () => {
    expect(mapClientTransformError(new Error('Network fail'))).toEqual(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Network error. Please try again.',
        retryable: true,
      })
    );
  });
});

function createNdjsonStream(lines: unknown[]): ReadableStream<Uint8Array> {
  const text = lines.map((line) => JSON.stringify(line) + '\n').join('');
  const encoded = new TextEncoder().encode(text);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
}

function createMockStreamResponse(lines: unknown[]) {
  return {
    headers: new Headers({ 'Content-Type': 'application/x-ndjson' }),
    body: createNdjsonStream(lines),
  };
}
