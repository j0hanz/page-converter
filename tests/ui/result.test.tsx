// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TransformResultPanel from '@/components/features/result';

import type { TransformResult } from '@/lib/api';

const baseResult: TransformResult = {
  url: 'https://example.com',
  resolvedUrl: 'https://example.com/',
  finalUrl: 'https://example.com/',
  title: 'Example Domain',
  metadata: {
    description: 'An example page',
    author: 'IANA',
  },
  markdown: '# Example\n\nThis is an example.',
  fetchedAt: '2026-03-10T12:00:00.000Z',
  contentSize: 42,
  truncated: false,
};

describe('TransformResultPanel', () => {
  beforeEach(() => {
    mockMatchMedia(1280);
  });

  it('renders markdown preview by default', () => {
    renderPanel();

    return waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
      expect(screen.getByText('This is an example.')).toBeInTheDocument();
    });
  });

  it('renders raw markdown in code view', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /code/i }));

    const pre = document.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain('# Example');
    expect(pre?.textContent).toContain('This is an example.');
  });

  it('shows copy markdown button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /copy markdown/i })
    ).toBeInTheDocument();
  });

  it('copies markdown to clipboard on button click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    renderPanel();
    await user.click(screen.getByRole('button', { name: /copy markdown/i }));

    expect(writeText).toHaveBeenCalledWith('# Example\n\nThis is an example.');
  });

  it('renders markdown images inline in preview mode', async () => {
    renderPanel({
      result: {
        ...baseResult,
        markdown: '![Tracker](https://images.example/tracker.png)',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Tracker' })).toHaveAttribute(
        'src',
        'https://images.example/tracker.png'
      );
    });
  });

  it('unmounts the preview tree when switching to code view', async () => {
    renderPanel({
      result: {
        ...baseResult,
        markdown: '![Tracker](https://images.example/tracker.png)',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Tracker' })).toBeInTheDocument();
    });

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /code/i }));

    expect(
      screen.queryByRole('img', { name: 'Tracker' })
    ).not.toBeInTheDocument();
  });

  it('renders favicon avatar with site icon', () => {
    renderPanel({
      result: {
        ...baseResult,
        metadata: {
          ...baseResult.metadata,
          favicon: 'https://example.com/favicon.ico',
        },
      },
    });

    return waitFor(() => {
      const avatar = screen.getByRole('img', { name: 'Example Domain' });
      expect(avatar).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });
  });

  it('renders letter fallback when favicon is missing', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('E')).toBeInTheDocument();
    });
  });

  it('updates the preview content when new result content arrives', async () => {
    const { rerender } = renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });

    rerender(
      <TransformResultPanel
        result={{
          ...baseResult,
          fetchedAt: '2026-03-10T12:01:00.000Z',
          title: 'Updated Domain',
          markdown: '# Updated',
        }}
      />
    );

    expect(screen.getByText('Updated Domain')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });

  it('uses the mobile result dialog flow on small screens', async () => {
    const user = userEvent.setup();
    mockMatchMedia(480);

    renderPanel();

    await user.click(screen.getByRole('button', { name: /view result/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /code/i }));

    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('# Example');
  });
});

function renderPanel({
  result = baseResult,
}: {
  result?: TransformResult;
} = {}) {
  return render(<TransformResultPanel result={result} />);
}

function mockMatchMedia(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: evaluateMediaQuery(query, width),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function evaluateMediaQuery(query: string, width: number) {
  const minWidth = /\(min-width:\s*([\d.]+)px\)/.exec(query);
  const maxWidth = /\(max-width:\s*([\d.]+)px\)/.exec(query);

  if (minWidth && width < Number(minWidth[1])) {
    return false;
  }

  if (maxWidth && width > Number(maxWidth[1])) {
    return false;
  }

  return true;
}
