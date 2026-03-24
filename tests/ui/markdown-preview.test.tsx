// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MarkdownPreview from '@/components/markdown-preview';

describe('MarkdownPreview', () => {
  it('renders GFM tables and callouts for richer informational content', () => {
    render(
      <MarkdownPreview>
        {`> Public pages only

| Item | Details |
| --- | --- |
| Output | Clean Markdown |`}
      </MarkdownPreview>
    );

    expect(screen.getByText('Public pages only')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Item' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'Clean Markdown' })
    ).toBeInTheDocument();
  });

  it('renders safe https images and blocks data: URI images', () => {
    render(
      <MarkdownPreview>
        {`![safe](https://example.com/img.png)\n\n![unsafe](data:image/svg+xml,<svg></svg>)`}
      </MarkdownPreview>
    );

    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('renders safe links and downgrades javascript: href to plain text', () => {
    render(
      <MarkdownPreview>
        {`[safe](https://example.com)\n\n[unsafe](javascript:alert(1))`}
      </MarkdownPreview>
    );

    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com');

    expect(screen.getByText('unsafe')).toBeInTheDocument();
    expect(screen.getByText('unsafe').closest('a')).toBeNull();
  });

  it('renders mailto: links as clickable', () => {
    render(
      <MarkdownPreview>{`[email](mailto:user@example.com)`}</MarkdownPreview>
    );

    const link = screen.getByRole('link', { name: 'email' });
    expect(link).toHaveAttribute('href', 'mailto:user@example.com');
  });

  it('renders fenced code blocks with a pre wrapper', () => {
    render(<MarkdownPreview>{'```\nline one\nline two\n```'}</MarkdownPreview>);

    const pre = document.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre).toHaveTextContent('line one line two');
  });

  it('renders inline code without a pre wrapper', () => {
    render(<MarkdownPreview>{'Use `npm install` to begin'}</MarkdownPreview>);

    expect(screen.getByText('npm install')).toBeInTheDocument();
    expect(document.querySelector('pre')).toBeNull();
  });
});
