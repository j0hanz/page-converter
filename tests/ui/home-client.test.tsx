// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import HomeClient from '@/components/home-client';
import type { TransformResult } from '@/lib/api';
import { submitUrlForm } from '@/tests/setup';

const VALID_URL = 'https://example.com';
const SUCCESS_RESULT: TransformResult = {
  url: VALID_URL,
  markdown: '# Example',
  fromCache: false,
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

  it('shows skeleton loading then transitions to an error and allows dismissing it', async () => {
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

    await userEvent.setup().click(screen.getByLabelText(/close/i));

    await waitFor(() => {
      expect(
        screen.queryByText('Upstream unavailable')
      ).not.toBeInTheDocument();
    });
  });

  it('shows a retryable error when the network request fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network fail'));

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    expect(
      await screen.findByText('Network error. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByText(/retryable/i)).toBeInTheDocument();
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
