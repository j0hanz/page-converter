// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TransformResultPanel from '@/components/result';
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
  fromCache: false,
  fetchedAt: '2026-03-10T12:00:00.000Z',
  contentSize: 42,
  truncated: false,
};

describe('TransformResultPanel', () => {
  it('renders markdown preview by default', async () => {
    renderPanel();

    expect(
      screen.getByRole('status', { name: /markdown preview loading/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
    expect(screen.getByText('This is an example.')).toBeInTheDocument();
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

  it('shows truncation warning when truncated', () => {
    renderPanel({ result: { ...baseResult, truncated: true } });
    expect(screen.getByText(/content was truncated/i)).toBeInTheDocument();
  });

  it('does not show truncation warning when not truncated', () => {
    renderPanel();
    expect(
      screen.queryByText(/content was truncated/i)
    ).not.toBeInTheDocument();
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

    const avatar = screen.getByRole('img', { name: 'Example Domain' });
    expect(avatar).toHaveAttribute('src', 'https://example.com/favicon.ico');
  });

  it('renders letter fallback when favicon is missing', () => {
    renderPanel();

    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('shows cache badge when fromCache is true', () => {
    const { container } = renderPanel({
      result: { ...baseResult, fromCache: true },
    });

    const badge = container.querySelector('.MuiBadge-dot');
    expect(badge).toBeInTheDocument();
  });

  it('hides cache badge when fromCache is false', () => {
    const { container } = renderPanel({
      result: { ...baseResult, fromCache: false },
    });

    const badge = container.querySelector('.MuiBadge-dot');
    expect(badge).toHaveClass('MuiBadge-invisible');
  });

  it('renders author chip when author exists', () => {
    renderPanel();

    expect(screen.getByText('IANA')).toBeInTheDocument();
  });

  it('does not render author chip when author is missing', () => {
    renderPanel({
      result: {
        ...baseResult,
        metadata: { ...baseResult.metadata, author: undefined },
      },
    });

    expect(screen.queryByText('IANA')).not.toBeInTheDocument();
  });

  it('shows the skeleton again when new preview content arrives', async () => {
    const { rerender } = renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
    });

    rerender(
      <TransformResultPanel
        result={{
          ...baseResult,
          fetchedAt: '2026-03-10T12:01:00.000Z',
          markdown: '# Updated',
        }}
      />
    );

    expect(
      screen.getByRole('status', { name: /markdown preview loading/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});

function renderPanel({
  result = baseResult,
}: {
  result?: TransformResult;
} = {}) {
  return render(<TransformResultPanel result={result} />);
}
