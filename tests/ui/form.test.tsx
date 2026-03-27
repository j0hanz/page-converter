// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TransformForm from '@/components/features/form';

import { submitUrlForm } from '@/tests/setup';

const action = vi.fn();
const VALID_URL = 'https://example.com';

describe('TransformForm', () => {
  it('renders URL input and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /convert/i })
    ).toBeInTheDocument();
  });

  it('submits the current URL value', async () => {
    renderForm();
    await submitUrlForm(VALID_URL);

    expect(action).toHaveBeenCalled();
    const mockCall = action.mock.calls[0];
    expect(mockCall).toBeDefined();
    if (!mockCall) return;
    const formData = mockCall[0] as FormData;
    expect(formData.get('url')).toBe(VALID_URL);
  });

  it('disables the URL input and shows loading state on button', () => {
    renderForm({ isPending: true });

    expect(screen.getByLabelText(/URL/i)).toBeDisabled();

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

function renderForm({ isPending = false }: { isPending?: boolean } = {}) {
  return render(<TransformForm action={action} isPending={isPending} />);
}
