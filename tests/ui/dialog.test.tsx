// @vitest-environment jsdom
import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseDialog } from '@/components/ui/dialog';

describe('BaseDialog', () => {
  beforeEach(() => {
    mockMatchMedia(1280);
  });

  it('uses a fullscreen dialog on small screens by default', () => {
    mockMatchMedia(480);

    renderDialog();

    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeTruthy();
  });

  it('forwards standard Dialog props to the underlying MUI dialog', () => {
    renderDialog({
      'aria-describedby': 'dialog-description',
      PaperProps: {
        'data-testid': 'dialog-paper',
      },
      children: <p id="dialog-description">Dialog body</p>,
    });

    expect(screen.getByRole('dialog')).toHaveAttribute(
      'aria-describedby',
      'dialog-description'
    );
    expect(screen.getByTestId('dialog-paper')).toBeInTheDocument();
  });

  it('invokes onClose when the default close action is used', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDialog({ onClose });
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledWith(expect.any(Object), 'escapeKeyDown');
  });
});

function renderDialog(props: Partial<ComponentProps<typeof BaseDialog>> = {}) {
  const { children = 'Dialog body', onClose = vi.fn(), ...rest } = props;

  return render(
    <BaseDialog
      open
      onClose={onClose}
      title="Dialog title"
      titleId="dialog-title"
      {...rest}
    >
      {children}
    </BaseDialog>
  );
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
