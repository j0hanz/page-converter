import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/transform/route';

import type { StreamEvent, TransformResponse } from '@/lib/api';
import { callFetchUrl, parseMcpResult } from '@/lib/mcp';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});

const { callFetchUrlMock, parseMcpResultMock } = vi.hoisted(() => ({
  callFetchUrlMock: vi.fn(),
  parseMcpResultMock: vi.fn(),
}));

vi.mock('@/lib/mcp', () => {
  return {
    callFetchUrl: callFetchUrlMock,
    parseMcpResult: parseMcpResultMock,
  };
});

const successResponse = {
  ok: true,
  result: {
    url: 'https://example.com',
    title: 'Mock Page',
    resolvedUrl: 'https://example.com',
    markdown: '# Mock Content',
    metadata: {},
    fetchedAt: '2026-03-30T00:00:00.000Z',
    contentSize: 100,
    truncated: false,
  },
} satisfies TransformResponse;

describe('POST /api/transform', () => {
  beforeEach(() => {
    callFetchUrlMock.mockReset();
    parseMcpResultMock.mockReset();
  });

  it('returns a JSON validation error for an invalid request body', async () => {
    const request = new Request('http://localhost:3000/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(callFetchUrlMock).not.toHaveBeenCalled();
  });

  it('returns an immediate JSON error before any progress is emitted', async () => {
    callFetchUrlMock.mockResolvedValueOnce({ _mocked_raw_result: true });
    parseMcpResultMock.mockReturnValueOnce({
      ok: false,
      error: {
        code: 'HTTP_ERROR',
        message: 'Forbidden',
        retryable: false,
        statusCode: 403,
      },
    } satisfies TransformResponse);

    const request = new Request('http://localhost:3000/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'HTTP_ERROR', message: 'Forbidden' },
    });
  });

  it('streams progress and result as NDJSON', async () => {
    callFetchUrlMock.mockImplementationOnce(
      (_args: unknown, options?: { onProgress?: (event: unknown) => void }) => {
        if (options?.onProgress) {
          options.onProgress({ progress: 1, total: 10, message: 'Step 1' });
          options.onProgress({ progress: 2, total: 10, message: 'Step 2' });
        }
        return Promise.resolve({ _mocked_raw_result: true });
      }
    );
    parseMcpResultMock.mockReturnValueOnce(successResponse);

    const request = new Request('http://localhost:3000/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);

    // Should return HTTP 200 with ndjson content-type
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain(
      'application/x-ndjson'
    );

    // Read the stream
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let streamContent = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      streamContent += decoder.decode(value, { stream: true });
    }
    streamContent += decoder.decode();

    // Split stream content into NDJSON events
    const lines = streamContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(lines.length).toBeGreaterThan(0);

    const events = lines.map((line) => JSON.parse(line) as StreamEvent);

    // Verify progress events
    const progressEvents = events.filter((e) => e.type === 'progress');
    expect(progressEvents.length).toBe(2);
    expect(progressEvents[0]).toMatchObject({
      type: 'progress',
      progress: 1,
      message: 'Step 1',
    });

    // Verify terminal result event
    const resultEvents = events.filter((e) => e.type === 'result');
    expect(resultEvents.length).toBe(1);
    expect(resultEvents[0]).toMatchObject({
      type: 'result',
      ok: true,
      result: {
        url: 'https://example.com',
        markdown: '# Mock Content',
      },
    });

    // Ensure the MCP mock was actually called
    expect(callFetchUrl).toHaveBeenCalled();
    expect(parseMcpResult).toHaveBeenCalled();
  });

  it('closes the NDJSON response stream when the request is aborted', async () => {
    const deferred = Promise.withResolvers<unknown>();
    const abortController = new AbortController();
    const rawResult = { _mocked_raw_result: true };

    callFetchUrlMock.mockImplementationOnce(
      (_args: unknown, options?: { onProgress?: (event: unknown) => void }) => {
        options?.onProgress?.({ progress: 1, total: 10, message: 'Step 1' });
        return deferred.promise;
      }
    );
    parseMcpResultMock.mockImplementationOnce(() => successResponse);

    const request = new Request('http://localhost:3000/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: abortController.signal,
    });

    const response = await POST(request);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const firstChunk = await reader?.read();
    expect(decoder.decode(firstChunk?.value ?? new Uint8Array())).toContain(
      '"type":"progress"'
    );

    abortController.abort();
    deferred.resolve(rawResult);

    const secondChunk = await reader?.read();
    expect(secondChunk?.done).toBe(true);
  });
});
