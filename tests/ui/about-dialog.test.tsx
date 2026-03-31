// @vitest-environment jsdom
import { Suspense } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AboutDialog from '@/components/features/about-dialog';
import AboutDialogPanel from '@/components/features/about-dialog-panel';

describe('AboutDialog', () => {
  it('exposes an accessible dialog name', async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog
        aboutMarkdown="# Overview"
        howItWorksMarkdown="# How It Works"
      />
    );

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('dialog', { name: /about/i })
    ).toBeInTheDocument();
  });

  it('loads help content when opened', async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog
        aboutMarkdown="# Overview"
        howItWorksMarkdown="# How It Works"
      />
    );

    expect(
      screen.getByRole('button', { name: /about fetch url/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('dialog', { name: /about/i })
    ).toBeInTheDocument();
  });

  it('renders the markdown tab content once the panel has content', async () => {
    render(
      <Suspense fallback={<div>Loading panel...</div>}>
        <AboutDialogPanel
          aboutMarkdown="# Overview"
          howItWorksMarkdown="# How It Works"
          open
          onClose={() => {}}
        />
      </Suspense>
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
