import { describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/transform/route';

import type { StreamEvent, TransformResponse } from '@/lib/api';
import { callFetchUrl, parseMcpResult } from '@/lib/mcp';

// Mock the MCP transport layer to avoid starting actual node processes
vi.mock('@/lib/mcp', () => {
  return {
    callFetchUrl: vi.fn(
      (_args: unknown, options?: { onProgress?: (event: unknown) => void }) => {
        // Simulate an MCP tool emitting progress events
        if (options?.onProgress) {
          options.onProgress({ progress: 1, total: 10, message: 'Step 1' });
          options.onProgress({ progress: 2, total: 10, message: 'Step 2' });
        }
        return Promise.resolve({ _mocked_raw_result: true });
      }
    ),
    parseMcpResult: vi.fn().mockReturnValue({
      ok: true,
      result: {
        url: 'https://example.com',
        title: 'Mock Page',
        resolvedUrl: 'https://example.com',
        markdown: '# Mock Content',
        metadata: {},
        fetchedAt: new Date().toISOString(),
        contentSize: 100,
        truncated: false,
      },
    } satisfies TransformResponse),
  };
});

describe('POST /api/transform', () => {
  it('streams progress and result as NDJSON', async () => {
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
});
