// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import HomeClient, { createRequestController } from '@/components/home-client';
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
  it('transitions from streamed progress to the final result', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    stream.emit({
      type: 'progress',
      progress: 1,
      total: 8,
      message: 'Fetching',
    });

    await waitFor(() => {
      expect(screen.getByText('Fetching')).toBeInTheDocument();
    });

    stream.emit({ type: 'result', ok: true, result: SUCCESS_RESULT });
    stream.close();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
    expect(screen.queryByText('Fetching')).not.toBeInTheDocument();
  });

  it('transitions from streamed progress to an error and allows dismissing it', async () => {
    const stream = createControlledStreamResponse();
    global.fetch = vi.fn().mockResolvedValue(stream.response);

    render(<HomeClient />);
    await submitUrlForm(VALID_URL);

    stream.emit({
      type: 'progress',
      progress: 1,
      total: 8,
      message: 'Fetching',
    });

    await waitFor(() => {
      expect(screen.getByText('Fetching')).toBeInTheDocument();
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
    expect(screen.queryByText('Fetching')).not.toBeInTheDocument();

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

describe('createRequestController', () => {
  it('ignores stale events after a replacement request starts', () => {
    const dispatch = vi.fn();
    const clearInput = vi.fn();
    const controller = createRequestController({ clearInput, dispatch });

    const firstSession = controller.beginRequest();
    const secondSession = controller.beginRequest();

    expect(firstSession.abortController.signal.aborted).toBe(true);
    expect(controller.isActiveRequest(firstSession)).toBe(false);
    expect(controller.isActiveRequest(secondSession)).toBe(true);

    controller.dispatchIfActive(firstSession, {
      type: 'progress',
      event: { type: 'progress', progress: 1, total: 8, message: 'stale' },
    });
    controller.dispatchIfActive(firstSession, {
      type: 'result',
      result: SUCCESS_RESULT,
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(clearInput).not.toHaveBeenCalled();
  });

  it('clears input only for active terminal actions', () => {
    const dispatch = vi.fn();
    const clearInput = vi.fn();
    const controller = createRequestController({ clearInput, dispatch });
    const session = controller.beginRequest();

    controller.dispatchIfActive(session, {
      type: 'progress',
      event: { type: 'progress', progress: 1, total: 8, message: 'Loading' },
    });
    controller.dispatchIfActive(session, {
      type: 'error',
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed',
        retryable: true,
      },
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(clearInput).toHaveBeenCalledTimes(1);
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
