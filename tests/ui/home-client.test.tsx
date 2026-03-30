// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomeClient from '@/components/features/home-client';

import type { TransformResult } from '@/lib/api';

import { submitUrlForm } from '@/tests/setup';

const VALID_URL = 'https://example.com';
const SUCCESS_RESULT: TransformResult = {
  url: VALID_URL,
  markdown: '# Example',
  fetchedAt: '2026-03-10T00:00:00Z',
  contentSize: 9,
  truncated: false,
  metadata: {},
};

describe('HomeClient', () => {
  it('shows skeleton loading then transitions to the final result', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: /markdown preview loading/i })
      ).toBeInTheDocument();
    });

    stream.emit({ type: 'result', ok: true, result: SUCCESS_RESULT });
    stream.close();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
  });

  it('shows skeleton loading then transitions to an error', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: /markdown preview loading/i })
      ).toBeInTheDocument();
    });

    stream.emit({
      type: 'result',
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Upstream unavailable',
        retryable: true,
      },
    });
    stream.close();

    await waitFor(() => {
      expect(screen.getByText('Upstream unavailable')).toBeInTheDocument();
    });
  });

  it('shows a retryable error when the network request fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network fail'));

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    expect(
      await screen.findByText('Network error. Please try again.')
    ).toBeInTheDocument();
  });

  it('aborts the active request when the component unmounts', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockImplementation((_input, init?: RequestInit) => {
      stream.attachSignal(init?.signal);
      return Promise.resolve(stream.response);
    });

    const { unmount } = render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    unmount();

    expect(stream.signal?.aborted).toBe(true);
  });

  it('suppresses ABORTED errors and returns to idle', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    stream.emit({
      type: 'result',
      ok: false,
      error: {
        code: 'ABORTED',
        message: 'Request was cancelled',
        retryable: true,
      },
    });
    stream.close();

    await waitFor(() => {
      expect(
        screen.queryByText('Request was cancelled')
      ).not.toBeInTheDocument();
    });
  });

  it('clears a previous error when a new submission succeeds', async () => {
    const firstStream = createControlledStreamResponse();
    const secondStream = createControlledStreamResponse();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(firstStream.response)
      .mockResolvedValueOnce(secondStream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    firstStream.emit({
      type: 'result',
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Upstream unavailable',
        retryable: true,
      },
    });
    firstStream.close();

    expect(await screen.findByText('Upstream unavailable')).toBeInTheDocument();

    await submitUrlForm(VALID_URL);
    secondStream.emit({ type: 'result', ok: true, result: SUCCESS_RESULT });
    secondStream.close();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
    expect(screen.queryByText('Upstream unavailable')).not.toBeInTheDocument();
  });
});

function createControlledStreamResponse() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(nextController) {
      controller = nextController;
    },
  });

  return {
    response: {
      headers: new Headers({ 'Content-Type': 'application/x-ndjson' }),
      body,
    },
    signal: null as AbortSignal | null,
    attachSignal(signal?: AbortSignal | null) {
      this.signal = signal ?? null;
    },
    emit(line: unknown) {
      controller?.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
    },
    close() {
      controller?.close();
    },
  };
}
