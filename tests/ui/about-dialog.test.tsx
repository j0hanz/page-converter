// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AboutDialog from '@/components/features/about-dialog';

const aboutDialogProps = {
  aboutMarkdown: '# Overview',
  howItWorksMarkdown: '# How It Works',
} as const;

describe('AboutDialog', () => {
  it('exposes an accessible dialog name', async () => {
    const user = userEvent.setup();
    render(<AboutDialog {...aboutDialogProps} />);

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('dialog', { name: /about/i })
    ).toBeInTheDocument();
  });

  it('renders the markdown tab content', async () => {
    const user = userEvent.setup();
    render(<AboutDialog {...aboutDialogProps} />);

    expect(
      screen.getByRole('button', { name: /about fetch url/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about fetch url/i }));

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument();
  });
});
