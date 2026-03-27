import {
  type CallToolResult,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callFetchUrl } from '@/lib/mcp';
import { transformUrl } from '@/lib/transform';

vi.mock('@/lib/mcp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mcp')>();
  return {
    ...actual,
    callFetchUrl: vi.fn(),
  };
});

const callFetchUrlMock = vi.mocked(callFetchUrl);
const VALID_REQUEST = { url: 'https://example.com' };

const successResult: CallToolResult = {
  content: [],
  structuredContent: {
    url: 'https://example.com',
    markdown: '# Example',
    metadata: {},
    fetchedAt: '2026-03-11T00:00:00.000Z',
    contentSize: 9,
    truncated: false,
  },
};

describe('transformUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retries once for retryable MCP transport errors', async () => {
    callFetchUrlMock
      .mockRejectedValueOnce(
        new McpError(ErrorCode.RequestTimeout, 'Request timed out')
      )
      .mockResolvedValueOnce(successResult);

    const response = await transformUrl(VALID_REQUEST);

    expect(callFetchUrlMock).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(true);
  });

  it('does not retry non-retryable MCP transport errors', async () => {
    callFetchUrlMock.mockRejectedValueOnce(
      new McpError(ErrorCode.MethodNotFound, 'tools/call not supported')
    );

    const response = await transformUrl(VALID_REQUEST);

    expect(callFetchUrlMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(false);
    if (response.ok) {
      throw new Error('Expected transformUrl to return an error response.');
    }

    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(response.error.retryable).toBe(false);
  });

  it('forwards the abort signal to the MCP client call', async () => {
    const abortController = new AbortController();
    callFetchUrlMock.mockResolvedValueOnce(successResult);

    const response = await transformUrl(
      VALID_REQUEST,
      undefined,
      abortController.signal
    );

    expect(callFetchUrlMock).toHaveBeenCalledWith(
      VALID_REQUEST,
      expect.objectContaining({ signal: abortController.signal })
    );
    expect(response.ok).toBe(true);
  });
});
