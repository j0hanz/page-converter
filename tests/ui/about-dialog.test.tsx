// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AboutDialog from '@/components/features/about-dialog';
import AboutDialogPanel from '@/components/features/about-dialog-panel';

describe('AboutDialog', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          aboutMarkdown: '# Overview',
          howItWorksMarkdown: '# How It Works',
        }),
    } satisfies Partial<Response>);
  });

  it('exposes an accessible dialog name', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('dialog', { name: /about/i })
    ).toBeInTheDocument();
  });

  it('loads help content when opened', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    expect(
      screen.getByRole('button', { name: /about fetch url/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('status', { name: /markdown preview loading/i })
    ).toBeInTheDocument();
  });

  it('renders the markdown tab content once the panel has content', async () => {
    render(
      <AboutDialogPanel
        aboutMarkdown="# Overview"
        howItWorksMarkdown="# How It Works"
        contentLoadFailed={false}
        isContentLoading={false}
        open
        onClose={() => {}}
        onRetry={() => {}}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('status', { name: /markdown preview loading/i })
      ).not.toBeInTheDocument();
    });

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument();
  });
});
