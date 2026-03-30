// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AboutDialog from '@/components/features/about-dialog';

describe('AboutDialog', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          markdown: '# Overview',
          howItWorksMarkdown: '# How It Works',
        }),
    } as Response);

    vi.stubGlobal('fetch', fetchMock);
  });

  it('exposes an accessible dialog name', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('dialog', { name: /about/i })
    ).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, options] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe('/api/home-content');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('renders the markdown tab content', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    expect(
      screen.getByRole('button', { name: /about fetch url/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument();
  });
});
